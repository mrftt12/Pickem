import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { Matchup, Pick, Week, WeeklySummary } from "../types/pickem";
import { WeekSelector } from "../components/WeekSelector";
import { ProgressMeter } from "../components/ProgressMeter";
import { MatchupCard } from "../components/MatchupCard";
import { StatPill } from "../components/StatPill";
import { palette, spacing } from "../theme/colors";

type Props = {
  weeks: Week[];
  selectedWeek?: Week;
  matchups: Matchup[];
  picks: Record<string, Pick>;
  summary?: WeeklySummary;
  submissionProgress: { completed: number; total: number; percent: number };
  onSelectWeek: (id: number) => void;
  onTogglePick: (matchupId: string, side: "home" | "away") => void;
};

export function WeeklyPicksScreen({
  weeks,
  selectedWeek,
  matchups,
  picks,
  summary,
  submissionProgress,
  onSelectWeek,
  onTogglePick,
}: Props) {
  const isLocked = selectedWeek?.isLocked;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
      <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: spacing.md }}>
        Weekly Pickem
      </Text>
      <WeekSelector weeks={weeks} selectedWeekId={selectedWeek?.id} onSelect={onSelectWeek} />
      {summary && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: spacing.lg,
            paddingHorizontal: spacing.md,
          }}
        >
          <StatPill label="Correct" value={`${summary.correctPicks}/${summary.totalGames}`} />
          <StatPill label="Rank" value={`#${summary.rank}`} accent={palette.primary} />
          <StatPill label="Potential" value={`${summary.potentialPoints}`} accent={palette.secondary} />
        </View>
      )}
      <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.md }}>
        <ProgressMeter {...submissionProgress} />
      </View>
      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: spacing.md }}>
        {matchups.map((matchup) => (
          <MatchupCard
            key={matchup.id}
            matchup={matchup}
            pick={picks[matchup.id]}
            onSelect={(side) => onTogglePick(matchup.id, side)}
          />
        ))}
      </View>
      <TouchableOpacity
        disabled={isLocked}
        style={{
          marginHorizontal: spacing.md,
          marginTop: spacing.lg,
          backgroundColor: isLocked ? palette.border : palette.primary,
          borderRadius: spacing.md,
          paddingVertical: spacing.md,
          alignItems: "center",
        }}
        activeOpacity={0.9}
      >
        <Text style={{ color: isLocked ? palette.textSecondary : "#0b1729", fontWeight: "700" }}>
          {isLocked ? "Week Locked" : "Submit Picks"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
