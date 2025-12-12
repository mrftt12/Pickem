import { ScrollView, Text, View } from "react-native";
import type { Payment, WeeklySummary } from "../types/pickem";
import { PaymentCard } from "../components/PaymentCard";
import { palette, spacing } from "../theme/colors";

type Props = {
  activeSummary?: WeeklySummary;
  payments: Payment[];
};

export function ProfileScreen({ activeSummary, payments }: Props) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: palette.textPrimary, fontSize: 24, fontWeight: "700" }}>Profile</Text>
      {activeSummary && (
        <View
          style={{
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: spacing.lg,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.card,
            gap: spacing.xs,
          }}
        >
          <Text style={{ color: palette.muted, fontSize: 12, letterSpacing: 1 }}>THIS WEEK</Text>
          <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: "700" }}>
            {activeSummary.correctPicks}/{activeSummary.totalGames} correct • #{activeSummary.rank}
          </Text>
          <Text style={{ color: palette.textSecondary }}>
            Potential points: {activeSummary.potentialPoints}
          </Text>
        </View>
      )}
      <Text
        style={{
          color: palette.textSecondary,
          fontSize: 18,
          fontWeight: "600",
          marginTop: spacing.lg,
          marginBottom: spacing.sm,
        }}
      >
        Payments
      </Text>
      <View style={{ gap: spacing.sm }}>
        {payments.map((payment) => (
          <PaymentCard key={payment.id} payment={payment} />
        ))}
      </View>
    </ScrollView>
  );
}
