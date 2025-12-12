import { useMemo, useState } from "react";
import { leaderboard, matchupsByWeek, payments, weeks, weeklySummaries } from "../data/mockData";
import type { Matchup, Pick, Week } from "../types/pickem";

const buildPickMap = (matchups: Matchup[]): Record<string, Pick> => {
  const entries: Record<string, Pick> = {};
  matchups.forEach((matchup, idx) => {
    entries[matchup.id] = {
      matchupId: matchup.id,
      selected: null,
      confidence: matchups.length - idx,
    };
  });
  return entries;
};

export function usePickemData() {
  const resolveInitialWeek = () => {
    const now = new Date();
    const current = weeks.find((week) => {
      const start = new Date(week.startDate);
      const end = new Date(week.endDate);
      return now >= start && now <= end;
    });
    return current?.id ?? weeks[0]?.id ?? 1;
  };

  const [selectedWeekId, setSelectedWeekId] = useState(resolveInitialWeek);
  const [pickState, setPickState] = useState<Record<number, Record<string, Pick>>>(() => {
    const initialWeek = resolveInitialWeek();
    if (!initialWeek) return {};
    return {
      [initialWeek]: buildPickMap(matchupsByWeek[initialWeek] ?? []),
    };
  });

  const selectedWeek: Week | undefined = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId),
    [selectedWeekId]
  );

  const matchups: Matchup[] = useMemo(() => matchupsByWeek[selectedWeekId] ?? [], [selectedWeekId]);

  const picks = pickState[selectedWeekId] ?? buildPickMap(matchups);

  const setWeek = (weekId: number) => {
    setSelectedWeekId(weekId);
    setPickState((current) => {
      if (current[weekId]) return current;
      return {
        ...current,
        [weekId]: buildPickMap(matchupsByWeek[weekId] ?? []),
      };
    });
  };

  const togglePick = (matchupId: string, side: "home" | "away") => {
    setPickState((current) => {
      const weekDraft = current[selectedWeekId] ?? buildPickMap(matchups);
      const pick = weekDraft[matchupId];
      const nextSelected = pick?.selected === side ? null : side;
      const updatedPick: Pick = {
        ...pick,
        selected: nextSelected,
      };
      return {
        ...current,
        [selectedWeekId]: {
          ...weekDraft,
          [matchupId]: updatedPick,
        },
      };
    });
  };

  const submissionProgress = useMemo(() => {
    if (!matchups.length) return { completed: 0, total: 0, percent: 0 };
    const completed = matchups.filter((matchup) => picks[matchup.id]?.selected).length;
    return {
      completed,
      total: matchups.length,
      percent: Math.round((completed / matchups.length) * 100),
    };
  }, [matchups, picks]);

  const summary = selectedWeek ? weeklySummaries[selectedWeek.id] : undefined;

  return {
    weeks,
    selectedWeek,
    setWeek,
    matchups,
    picks,
    togglePick,
    submissionProgress,
    leaderboard,
    payments,
    summary,
  };
}
