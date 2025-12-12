import { ScrollView, Text, View } from "react-native";
import type { LeaderboardRow } from "../types/pickem";
import { LeaderboardCard } from "../components/LeaderboardCard";
import { palette, spacing } from "../theme/colors";

type Props = {
  standings: LeaderboardRow[];
};

export function LeaderboardScreen({ standings }: Props) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: spacing.md }}>
        Leaderboard
      </Text>
      <View
        style={{
          backgroundColor: palette.card,
          borderRadius: spacing.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        {standings.map((entry, index) => (
          <LeaderboardCard key={entry.id} entry={entry} rank={index + 1} />
        ))}
      </View>
    </ScrollView>
  );
}
