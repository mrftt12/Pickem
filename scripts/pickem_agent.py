"""Weekly NFL pick'em agent.

This script retrieves league-wide data from ESPN's public APIs, assembles
matchups for a user-specified week, and produces a simple pick recommendation
for each game along with the current point spread.

Usage:
    python nfl_pickem_agent.py --week 5

Dependencies:
    - requests
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests


TEAMS_URL = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams?limit=32"
STATS_URL_TEMPLATE = (
    "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/"
    "seasons/2025/types/2/teams/{team_id}/statistics"
)
SCHEDULE_URL_TEMPLATE = (
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}/schedule"
)
PAST_PERFORMANCE_URL_TEMPLATE = (
    "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/"
    "teams/{team_id}/odds/1002/past-performances?limit=134"
)


class NFLPickemError(RuntimeError):
    """Custom error for workflow issues."""


@dataclass
class TeamProfile:
    """Container describing a team's current state."""

    team_id: str
    name: str
    stats: Dict[str, Any]
    flat_stats: Dict[str, float]
    schedule_events: List[Dict[str, Any]]
    past_performance: Dict[str, Any]
    recent_form: float
    cover_rate: float
    rating: float


def fetch_json(url: str) -> Dict[str, Any]:
    """Fetch JSON payload with basic error handling."""

    response = requests.get(url, timeout=20)
    response.raise_for_status()
    return response.json()


def flatten_stats(stats_payload: Dict[str, Any]) -> Dict[str, float]:
    """Flatten the nested statistics payload into name -> numeric value."""

    flattened: Dict[str, float] = {}
    for split in stats_payload.get("splits", []):
        for category in split.get("categories", []):
            for stat in category.get("stats", []):
                name = stat.get("name")
                value = stat.get("value")
                if name is None:
                    continue
                if isinstance(value, (int, float)):
                    flattened[name] = float(value)
                else:
                    try:
                        flattened[name] = float(value)
                    except (TypeError, ValueError):
                        continue
    return flattened


def compute_recent_form(events: List[Dict[str, Any]], team_id: str, lookback: int = 5) -> float:
    """Return the win percentage over the specified number of completed games."""

    completed_results: List[int] = []
    for event in events:
        status = event.get("status", {})
        status_type = status.get("type", {})
        if not status_type.get("completed"):
            continue
        competitions = event.get("competitions", [])
        if not competitions:
            continue
        competitors = competitions[0].get("competitors", [])
        for competitor in competitors:
            team = competitor.get("team", {})
            if team.get("id") != team_id:
                continue
            completed_results.append(1 if competitor.get("winner") else 0)
            break
    if not completed_results:
        return 0.5
    sliced = completed_results[-lookback:]
    return sum(sliced) / len(sliced)


def compute_cover_rate(past_performance: Dict[str, Any], team_id: str, lookback: int = 10) -> float:
    """Estimate how often the team covers the spread based on recent data."""

    items = past_performance.get("items", [])[:lookback]
    if not items:
        return 0.5
    successes = 0
    total = 0
    for item in items:
        spread_winner = item.get("spreadWinner")
        if isinstance(spread_winner, dict):
            ref = spread_winner.get("$ref", "")
            total += 1
            if ref.endswith(f"/{team_id}"):
                successes += 1
        elif isinstance(spread_winner, str):
            total += 1
            if spread_winner.endswith(str(team_id)):
                successes += 1
    return (successes / total) if total else 0.5


def lookup_stat(flat_stats: Dict[str, float], *names: str, default: float = 0.0) -> float:
    """Return the first existing stat value for the provided keys."""

    for name in names:
        if name in flat_stats:
            return flat_stats[name]
    return default


def compute_rating(flat_stats: Dict[str, float], recent_form: float, cover_rate: float) -> float:
    """Combine various stats into a normalized rating."""

    wins = lookup_stat(flat_stats, "wins", "overallWins", "overallRecordWins")
    losses = lookup_stat(flat_stats, "losses", "overallLosses", "overallRecordLosses")
    ties = lookup_stat(flat_stats, "ties", "overallTies", "overallRecordTies")
    games = wins + losses + ties
    win_pct = wins / games if games else 0.5

    points_for = lookup_stat(flat_stats, "pointsFor", "pointsForTotal")
    points_against = lookup_stat(flat_stats, "pointsAgainst", "pointsAgainstTotal")
    scoring_margin = (points_for - points_against) / max(games, 1)

    rating = (win_pct * 0.6) + (recent_form * 0.25) + (cover_rate * 0.15)
    rating += scoring_margin / 100.0
    return max(0.0, min(rating, 1.5))


def build_team_profiles() -> Dict[str, TeamProfile]:
    """Fetch all required data to assemble team profiles."""

    payload = fetch_json(TEAMS_URL)
    teams = payload.get("items", [])
    if not teams:
        raise NFLPickemError("Unable to retrieve NFL teams from ESPN API")

    profiles: Dict[str, TeamProfile] = {}
    for team in teams:
        team_id = str(team.get("id"))
        if not team_id:
            continue

        stats = fetch_json(STATS_URL_TEMPLATE.format(team_id=team_id))
        schedule = fetch_json(SCHEDULE_URL_TEMPLATE.format(team_id=team_id))
        past_perf = fetch_json(PAST_PERFORMANCE_URL_TEMPLATE.format(team_id=team_id))

        flat_stats = flatten_stats(stats)
        events = schedule.get("events", [])
        recent_form = compute_recent_form(events, team_id)
        cover_rate = compute_cover_rate(past_perf, team_id)
        rating = compute_rating(flat_stats, recent_form, cover_rate)

        profiles[team_id] = TeamProfile(
            team_id=team_id,
            name=team.get("displayName", team.get("name", f"Team {team_id}")),
            stats=stats,
            flat_stats=flat_stats,
            schedule_events=events,
            past_performance=past_perf,
            recent_form=recent_form,
            cover_rate=cover_rate,
            rating=rating,
        )
    return profiles


def parse_point_spread(competition: Dict[str, Any]) -> str:
    """Extract the point spread string from the competition payload."""

    odds = competition.get("odds", [])
    if odds:
        spread = odds[0].get("spread")
        details = odds[0].get("details")
        if spread is not None:
            return str(spread)
        if details:
            return str(details)
    return "N/A"


def point_spread_value(spread: str) -> Optional[float]:
    """Convert a spread string into a float when possible."""

    if spread in (None, "N/A"):
        return None
    try:
        return float(spread)
    except (TypeError, ValueError):
        normalized = spread.replace("½", ".5")
        for token in normalized.replace("+", " +").replace("-", " -").split():
            try:
                return float(token)
            except ValueError:
                continue
    return None


def describe_team(profile: TeamProfile) -> str:
    """Return a short descriptor for output lines."""

    wins = lookup_stat(profile.flat_stats, "wins", "overallWins")
    losses = lookup_stat(profile.flat_stats, "losses", "overallLosses")
    recent = profile.recent_form * 100
    return f"{profile.name} ({int(wins)}-{int(losses)}, {recent:.0f}% recent)"


def evaluate_matchup(
    week: int,
    home: TeamProfile,
    away: TeamProfile,
    point_spread: str,
) -> Dict[str, Any]:
    """Determine the likely winner and justification for a matchup."""

    spread_value = point_spread_value(point_spread)
    rating_diff = home.rating - away.rating
    adjusted_diff = rating_diff
    if spread_value is not None:
        adjusted_diff -= spread_value / 10.0

    winner = home if adjusted_diff >= 0 else away
    loser = away if winner is home else home

    confidence_gap = abs(winner.rating - loser.rating)
    if confidence_gap >= 0.3:
        confidence = "High"
    elif confidence_gap >= 0.15:
        confidence = "Medium"
    else:
        confidence = "Low"

    rationale = [
        f"Rating edge: {winner.rating:.2f} vs {loser.rating:.2f}",
        f"Recent form: {winner.recent_form*100:.0f}% vs {loser.recent_form*100:.0f}%",
    ]

    return {
        "week": week,
        "home_team": home.name,
        "away_team": away.name,
        "point_spread": point_spread,
        "recommended_pick": winner.name,
        "confidence": confidence,
        "rationale": rationale,
        "teams": {
            "home": describe_team(home),
            "away": describe_team(away),
        },
    }


def gather_week_matchups(profiles: Dict[str, TeamProfile], week: int) -> List[Dict[str, Any]]:
    """Compile the list of matchups for the specified week."""

    processed_events: set[str] = set()
    matchups: List[Dict[str, Any]] = []

    for profile in profiles.values():
        for event in profile.schedule_events:
            event_week = event.get("week", {}).get("number")
            if event_week != week:
                continue

            event_id = event.get("id") or event.get("uid")
            if event_id is None or event_id in processed_events:
                continue
            processed_events.add(event_id)

            competitions = event.get("competitions", [])
            if not competitions:
                continue
            competition = competitions[0]
            competitors = competition.get("competitors", [])
            if len(competitors) < 2:
                continue

            home_comp = next((c for c in competitors if c.get("homeAway") == "home"), None)
            away_comp = next((c for c in competitors if c.get("homeAway") == "away"), None)
            if not home_comp or not away_comp:
                continue

            home_profile = profiles.get(str(home_comp.get("team", {}).get("id")))
            away_profile = profiles.get(str(away_comp.get("team", {}).get("id")))
            if not home_profile or not away_profile:
                continue

            spread = parse_point_spread(competition)
            matchup = evaluate_matchup(week, home_profile, away_profile, spread)
            matchups.append(matchup)

    matchups.sort(key=lambda item: item["home_team"])
    return matchups


def render_matchups(matchups: List[Dict[str, Any]], week: int) -> None:
    """Pretty-print matchup results to stdout."""

    if not matchups:
        print(f"No completed schedule entries found for week {week}.")
        return

    print(f"Week {week} NFL Pick'em Recommendations ({len(matchups)} games)\n")
    for item in matchups:
        print(f"{item['away_team']} at {item['home_team']}")
        print(f"Point spread: {item['point_spread']}")
        print(f"Pick: {item['recommended_pick']} (confidence: {item['confidence']})")
        print(f"Home summary: {item['teams']['home']}")
        print(f"Away summary: {item['teams']['away']}")
        for note in item["rationale"]:
            print(f" - {note}")
        print()


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""

    parser = argparse.ArgumentParser(description="Weekly NFL pick'em agent")
    parser.add_argument(
        "--week",
        type=int,
        required=True,
        help="Regular-season week number (1-18)",
    )
    return parser.parse_args()


def main() -> None:
    """Program entrypoint."""

    args = parse_args()
    if args.week < 1 or args.week > 18:
        raise NFLPickemError("Week must be between 1 and 18")

    profiles = build_team_profiles()
    matchups = gather_week_matchups(profiles, args.week)
    render_matchups(matchups, args.week)


if __name__ == "__main__":
    main()
