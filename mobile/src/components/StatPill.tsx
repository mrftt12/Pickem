import { Text, View } from "react-native";
import { palette, spacing } from "../theme/colors";

type Props = {
  label: string;
  value: string | number;
  accent?: string;
};

export function StatPill({ label, value, accent = palette.secondary }: Props) {
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.lg,
        borderWidth: 1,
        borderColor: palette.border,
        minWidth: 120,
      }}
    >
      <Text style={{ color: palette.muted, fontSize: 12, letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color: accent, fontSize: 20, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
