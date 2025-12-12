#!/usr/bin/env python3
"""Convert a CSV schedule into the mobile client mock JSON structure."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from typing import Dict, List

TEAM_META: Dict[str, Dict[str, str]] = {
    "49ers": {"id": "sf", "name": "San Francisco 49ers", "abbr": "SF", "primary": "#b00101", "secondary": "#ddb945"},
    "Bears": {"id": "chi", "name": "Chicago Bears", "abbr": "CHI", "primary": "#0b162a", "secondary": "#c83803"},
    "Bengals": {"id": "cin", "name": "Cincinnati Bengals", "abbr": "CIN", "primary": "#fb4f14", "secondary": "#000000"},
    "Bills": {"id": "buf", "name": "Buffalo Bills", "abbr": "BUF", "primary": "#00338d", "secondary": "#c60c30"},
    "Broncos": {"id": "den", "name": "Denver Broncos", "abbr": "DEN", "primary": "#fb4f14", "secondary": "#0a2343"},
    "Browns": {"id": "cle", "name": "Cleveland Browns", "abbr": "CLE", "primary": "#311d00", "secondary": "#ff3c00"},
    "Buccaneers": {"id": "tb", "name": "Tampa Bay Buccaneers", "abbr": "TB", "primary": "#d50a0a", "secondary": "#b1babf"},
    "Cardinals": {"id": "ari", "name": "Arizona Cardinals", "abbr": "ARI", "primary": "#97233f", "secondary": "#000000"},
    "Chargers": {"id": "lac", "name": "Los Angeles Chargers", "abbr": "LAC", "primary": "#0073cf", "secondary": "#ffc20e"},
    "Chiefs": {"id": "kc", "name": "Kansas City Chiefs", "abbr": "KC", "primary": "#e31837", "secondary": "#ffb81c"},
    "Colts": {"id": "ind", "name": "Indianapolis Colts", "abbr": "IND", "primary": "#003da5", "secondary": "#a2aaad"},
    "Commanders": {"id": "wsh", "name": "Washington Commanders", "abbr": "WSH", "primary": "#5a1414", "secondary": "#ffb612"},
    "Cowboys": {"id": "dal", "name": "Dallas Cowboys", "abbr": "DAL", "primary": "#041e42", "secondary": "#869397"},
    "Dolphins": {"id": "mia", "name": "Miami Dolphins", "abbr": "MIA", "primary": "#008e97", "secondary": "#f58220"},
    "Eagles": {"id": "phi", "name": "Philadelphia Eagles", "abbr": "PHI", "primary": "#004c54", "secondary": "#a5acaf"},
    "Falcons": {"id": "atl", "name": "Atlanta Falcons", "abbr": "ATL", "primary": "#a71930", "secondary": "#000000"},
    "Giants": {"id": "nyg", "name": "New York Giants", "abbr": "NYG", "primary": "#0b2265", "secondary": "#a71930"},
    "Jaguars": {"id": "jax", "name": "Jacksonville Jaguars", "abbr": "JAX", "primary": "#006778", "secondary": "#d7a22a"},
    "Jets": {"id": "nyj", "name": "New York Jets", "abbr": "NYJ", "primary": "#125740", "secondary": "#000000"},
    "Lions": {"id": "det", "name": "Detroit Lions", "abbr": "DET", "primary": "#0076b6", "secondary": "#b0b7bc"},
    "Packers": {"id": "gb", "name": "Green Bay Packers", "abbr": "GB", "primary": "#203731", "secondary": "#ffb612"},
    "Panthers": {"id": "car", "name": "Carolina Panthers", "abbr": "CAR", "primary": "#0085ca", "secondary": "#101820"},
    "Patriots": {"id": "ne", "name": "New England Patriots", "abbr": "NE", "primary": "#002244", "secondary": "#c60c30"},
    "Raiders": {"id": "lv", "name": "Las Vegas Raiders", "abbr": "LV", "primary": "#000000", "secondary": "#a5acaf"},
    "Rams": {"id": "lar", "name": "Los Angeles Rams", "abbr": "LAR", "primary": "#003594", "secondary": "#ffd100"},
    "Ravens": {"id": "bal", "name": "Baltimore Ravens", "abbr": "BAL", "primary": "#241773", "secondary": "#9e7c0c"},
    "Saints": {"id": "no", "name": "New Orleans Saints", "abbr": "NO", "primary": "#101820", "secondary": "#d2b887"},
    "Seahawks": {"id": "sea", "name": "Seattle Seahawks", "abbr": "SEA", "primary": "#002244", "secondary": "#69be28"},
    "Steelers": {"id": "pit", "name": "Pittsburgh Steelers", "abbr": "PIT", "primary": "#000000", "secondary": "#ffb612"},
    "Texans": {"id": "hou", "name": "Houston Texans", "abbr": "HOU", "primary": "#03202f", "secondary": "#a71930"},
    "Titans": {"id": "ten", "name": "Tennessee Titans", "abbr": "TEN", "primary": "#4b92db", "secondary": "#002244"},
    "Vikings": {"id": "min", "name": "Minnesota Vikings", "abbr": "MIN", "primary": "#4f2683", "secondary": "#ffc62f"},
}

REQUIRED_TEAMS = {
    "49ers",
    "Bears",
    "Bengals",
    "Bills",
    "Broncos",
    "Browns",
    "Buccaneers",
    "Cardinals",
    "Chargers",
    "Chiefs",
    "Colts",
    "Commanders",
    "Cowboys",
    "Dolphins",
    "Eagles",
    "Falcons",
    "Giants",
    "Jaguars",
    "Jets",
    "Lions",
    "Packers",
    "Panthers",
    "Patriots",
    "Raiders",
    "Rams",
    "Ravens",
    "Saints",
    "Seahawks",
    "Steelers",
    "Texans",
    "Titans",
    "Vikings",
}
MISSING_TEAMS = REQUIRED_TEAMS - set(TEAM_META)
if MISSING_TEAMS:
    raise SystemExit(f"Missing metadata for: {sorted(MISSING_TEAMS)}")

@dataclass
class TeamRecord:
    wins: int = 0
    losses: int = 0

    def as_text(self) -> str:
        return f"{self.wins}-{self.losses}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/2025_scores.csv", help="CSV generated from the ESPN/NFL scrape")
    parser.add_argument("--output", default="mobile/src/data/season2025.json", help="Destination JSON file")
    parser.add_argument("--season", type=int, default=2025, help="Season year for computing ISO dates")
    return parser.parse_args()


def parse_score(value: str | None) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except ValueError:
        return None


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise SystemExit(f"Input CSV not found: {input_path}")

    records: Dict[str, TeamRecord] = {team: TeamRecord() for team in TEAM_META}
    matchups_by_week: Dict[int, List[dict]] = defaultdict(list)
    week_dates: Dict[int, List[datetime]] = defaultdict(list)
    base_week1 = datetime(args.season, 9, 4, tzinfo=timezone.utc)

    with input_path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            week_label = (row.get("Week") or "").strip()
            home = (row.get("HomeTeam") or "").strip()
            away = (row.get("AwayTeam") or "").strip()
            if not week_label or not home or not away:
                continue
            if home not in TEAM_META or away not in TEAM_META:
                raise SystemExit(f"Missing metadata for {home} or {away}")

            week_num = int(week_label.split()[1])
            date_token = (row.get("Date") or "").strip()
            if date_token.upper() == "TBD":
                dt = base_week1 + timedelta(days=7 * (week_num - 1))
            else:
                dt = datetime.strptime(f"{date_token}-{args.season}", "%d-%b-%Y").replace(tzinfo=timezone.utc)
            kickoff = dt.replace(hour=17, minute=0)
            week_dates[week_num].append(dt)

            away_meta = TEAM_META[away]
            home_meta = TEAM_META[home]
            away_team = {
                "id": away_meta["id"],
                "name": away_meta["name"],
                "abbr": away_meta["abbr"],
                "record": records[away].as_text(),
                "primaryColor": away_meta["primary"],
                "secondaryColor": away_meta["secondary"],
                "score": parse_score(row.get("AwayScore")),
            }
            home_team = {
                "id": home_meta["id"],
                "name": home_meta["name"],
                "abbr": home_meta["abbr"],
                "record": records[home].as_text(),
                "primaryColor": home_meta["primary"],
                "secondaryColor": home_meta["secondary"],
                "score": parse_score(row.get("HomeScore")),
            }

            status_raw = (row.get("GameStatus") or "").strip().lower()
            status = "final" if status_raw == "final" else "scheduled"

            matchup = {
                "id": f"{args.season}-w{week_num}-{len(matchups_by_week[week_num]) + 1}",
                "weekId": week_num,
                "kickoff": kickoff.isoformat().replace("+00:00", "Z"),
                "venue": f"{home_meta['name']} Stadium",
                "network": (row.get("Day") or "TBD").strip() or "TBD",
                "spread": "EVEN",
                "favorite": "even",
                "status": status,
                "homeTeam": home_team,
                "awayTeam": away_team,
            }
            matchups_by_week[week_num].append(matchup)

            home_score = home_team["score"]
            away_score = away_team["score"]
            if isinstance(home_score, int) and isinstance(away_score, int):
                if home_score > away_score:
                    records[home].wins += 1
                    records[away].losses += 1
                elif away_score > home_score:
                    records[away].wins += 1
                    records[home].losses += 1

    weeks = []
    weekly_summaries: Dict[str, dict] = {}
    for week_num in sorted(matchups_by_week):
        dates = week_dates[week_num]
        start_dt = min(dates).replace(hour=0, minute=0)
        end_dt = max(dates).replace(hour=23, minute=59)
        lock_dt = min(dates).replace(hour=17, minute=0)
        weeks.append({
            "id": week_num,
            "weekNumber": week_num,
            "startDate": start_dt.isoformat().replace("+00:00", "Z"),
            "endDate": end_dt.isoformat().replace("+00:00", "Z"),
            "lockDate": lock_dt.isoformat().replace("+00:00", "Z"),
            "isLocked": False,
        })
        weekly_summaries[str(week_num)] = {
            "correctPicks": 0,
            "totalGames": len(matchups_by_week[week_num]),
            "rank": 0,
            "potentialPoints": len(matchups_by_week[week_num]) * 10,
            "bonusTokens": 0,
        }

    payload = {
        "weeks": weeks,
        "matchupsByWeek": {str(k): v for k, v in sorted(matchups_by_week.items())},
        "weeklySummaries": weekly_summaries,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {output_path} with {len(weeks)} weeks")


if __name__ == "__main__":
    main()
