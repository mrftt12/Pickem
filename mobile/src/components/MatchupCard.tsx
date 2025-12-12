import { Text, TouchableOpacity, View } from "react-native";
import type { Matchup, Pick } from "../types/pickem";
import { palette, spacing } from "../theme/colors";

type Props = {
  matchup: Matchup;
  pick?: Pick;
  onSelect: (side: "home" | "away") => void;
};

const formatKickoff = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
};

export function MatchupCard({ matchup, pick, onSelect }: Props) {
  const renderTeam = (side: "home" | "away") => {
    const team = matchup[`${side}Team`];
    const isPicked = pick?.selected === side;
    return (
      <TouchableOpacity
        key={team.id}
        onPress={() => onSelect(side)}
        activeOpacity={0.9}
        style={{
          flex: 1,
          backgroundColor: isPicked ? palette.primary : palette.surface,
          borderRadius: spacing.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: isPicked ? palette.primary : palette.border,
        }}
      >
        <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1 }}>
          {side === "home" ? "HOME" : "AWAY"}
        </Text>
        <Text style={{ color: palette.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 2 }}>
          {team.name}
        </Text>
        <Text style={{ color: palette.textSecondary, marginTop: 4 }}>{team.record}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderRadius: spacing.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: palette.border,
        gap: spacing.md,
      }}
    >
      <View>
        <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 1 }}>KICKOFF</Text>
        <Text style={{ color: palette.textPrimary, fontWeight: "600" }}>{formatKickoff(matchup.kickoff)}</Text>
        <Text style={{ color: palette.muted, marginTop: 2 }}>
          {matchup.venue} • {matchup.network}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>{["away", "home"].map((side) => renderTeam(side as "home" | "away"))}</View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderColor: palette.border,
          paddingTop: spacing.sm,
        }}
      >
        <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
          Spread: {matchup.spread}
        </Text>
        <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
          Confidence: {pick?.confidence ?? "--"}
        </Text>
      </View>
    </View>
  );
}
