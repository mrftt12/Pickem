import { Text, View } from "react-native";
import type { LeaderboardRow } from "../types/pickem";
import { palette, spacing } from "../theme/colors";

type Props = {
  entry: LeaderboardRow;
  rank: number;
};

export function LeaderboardCard({ entry, rank }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
        borderBottomWidth: rank === 5 ? 0 : 1,
        borderColor: palette.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: palette.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ color: palette.textPrimary, fontSize: 16 }}>{rank}</Text>
        </View>
        <View>
          <Text style={{ color: palette.textPrimary, fontWeight: "600", fontSize: 16 }}>{entry.icon} {entry.name}</Text>
          <Text style={{ color: palette.muted, fontSize: 12 }}>
            {entry.wins}-{entry.losses} • {entry.streak}
          </Text>
        </View>
      </View>
      <Text style={{ color: palette.secondary, fontWeight: "700", fontSize: 18 }}>{entry.points}</Text>
    </View>
  );
}
