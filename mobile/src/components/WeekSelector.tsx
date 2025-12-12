import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { Week } from "../types/pickem";
import { palette, spacing } from "../theme/colors";

type Props = {
  weeks: Week[];
  selectedWeekId?: number;
  onSelect: (id: number) => void;
};

export function WeekSelector({ weeks, selectedWeekId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
    >
      {weeks.map((week) => {
        const isActive = week.id === selectedWeekId;
        return (
          <TouchableOpacity
            key={week.id}
            onPress={() => onSelect(week.id)}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: 9999,
              backgroundColor: isActive ? palette.primary : palette.surface,
              borderWidth: 1,
              borderColor: isActive ? palette.primary : palette.border,
            }}
          >
            <View>
              <Text
                style={{
                  color: isActive ? "#0b1729" : palette.textSecondary,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                Week {week.weekNumber}
              </Text>
              <Text
                style={{
                  color: isActive ? "#0b1729" : palette.muted,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Locks {new Date(week.lockDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
