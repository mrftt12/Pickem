import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Text, TouchableOpacity, View } from "react-native";
import { usePickemData } from "./src/hooks/usePickemData";
import { WeeklyPicksScreen } from "./src/screens/WeeklyPicksScreen";
import { LeaderboardScreen } from "./src/screens/LeaderboardScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { palette, spacing } from "./src/theme/colors";

type Tab = "picks" | "leaderboard" | "profile";

const tabs: { id: Tab; label: string }[] = [
  { id: "picks", label: "Picks" },
  { id: "leaderboard", label: "Standings" },
  { id: "profile", label: "Profile" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("picks");
  const {
    weeks,
    selectedWeek,
    setWeek,
    matchups,
    picks,
    leaderboard,
    payments,
    togglePick,
    submissionProgress,
    summary,
  } = usePickemData();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: palette.background }}>
          {activeTab === "picks" && (
            <WeeklyPicksScreen
              weeks={weeks}
              selectedWeek={selectedWeek}
              matchups={matchups}
              picks={picks}
              summary={summary}
              submissionProgress={submissionProgress}
              onSelectWeek={setWeek}
              onTogglePick={togglePick}
            />
          )}
          {activeTab === "leaderboard" && <LeaderboardScreen standings={leaderboard} />}
          {activeTab === "profile" && <ProfileScreen activeSummary={summary} payments={payments} />}
        </View>
        <View
          style={{
            flexDirection: "row",
            padding: spacing.sm,
            backgroundColor: "rgba(3,7,18,0.85)",
            borderTopWidth: 1,
            borderColor: palette.border,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{ flex: 1, alignItems: "center", padding: spacing.sm }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: isActive ? palette.primary : palette.textSecondary,
                    fontWeight: isActive ? "700" : "500",
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
