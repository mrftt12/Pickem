import { Text, View } from "react-native";
import type { Payment } from "../types/pickem";
import { palette, spacing } from "../theme/colors";

const statusColor = {
  paid: palette.success,
  due: palette.danger,
  pending: palette.warning,
};

type Props = {
  payment: Payment;
};

export function PaymentCard({ payment }: Props) {
  const color = statusColor[payment.status];
  return (
    <View
      style={{
        backgroundColor: palette.card,
        padding: spacing.md,
        borderRadius: spacing.md,
        borderWidth: 1,
        borderColor: palette.border,
        gap: spacing.xs,
      }}
    >
      <Text style={{ color: palette.textPrimary, fontWeight: "600" }}>{payment.label}</Text>
      <Text style={{ color: palette.textSecondary }}>${payment.amount.toFixed(2)}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
        <Text style={{ color: palette.muted, fontSize: 12 }}>Due {new Date(payment.dueDate).toLocaleDateString()}</Text>
        <Text style={{ color, fontWeight: "700", textTransform: "uppercase", fontSize: 12 }}>{payment.status}</Text>
      </View>
    </View>
  );
}
