import { Text, View } from "react-native";
import { palette, spacing } from "../theme/colors";

type Props = {
  completed: number;
  total: number;
  percent: number;
};

export function ProgressMeter({ completed, total, percent }: Props) {
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: spacing.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <Text style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 1 }}>PICKS LOCK</Text>
        <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{percent}%</Text>
      </View>
      <View
        style={{
          height: 10,
          borderRadius: 999,
          backgroundColor: palette.card,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${percent}%`,
            backgroundColor: palette.primary,
            height: "100%",
          }}
        />
      </View>
      <Text style={{ color: palette.textPrimary, marginTop: spacing.sm, fontWeight: "600" }}>
        {completed} / {total} matchups selected
      </Text>
    </View>
  );
}
