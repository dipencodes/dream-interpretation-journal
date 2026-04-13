import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";

import { OnboardingScreen } from "../screens/OnboardingScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { JournalScreen } from "../screens/JournalScreen";
import { PlaygroundScreen } from "../screens/PlaygroundScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { InterpretationMethodSettingsScreen } from "../screens/InterpretationMethodSettingsScreen";
import { NotificationSettingsScreen } from "../screens/NotificationSettingsScreen";
import { PaywallScreen } from "../screens/PaywallScreen";
import { DreamInputScreen } from "../screens/DreamInputScreen";
import { DreamMoodScreen } from "../screens/DreamMoodScreen";
import { DreamInterpretMethodScreen } from "../screens/DreamInterpretMethodScreen";
import { DreamSummaryScreen } from "../screens/DreamSummaryScreen";
import {
  getHasCompletedOnboarding,
  setHasCompletedOnboarding,
} from "../services/appPreferences";
import { getDreams } from "../services/dreamStorage";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const completed = await getHasCompletedOnboarding();
        let resolvedCompleted = completed;

        if (!completed) {
          const dreams = await getDreams();
          if (dreams.length > 0) {
            resolvedCompleted = true;
            const earliestCreatedAt = dreams.reduce<number | null>((earliest, dream) => {
              if (
                typeof dream.createdAt !== "number" ||
                !Number.isFinite(dream.createdAt) ||
                dream.createdAt <= 0
              ) {
                return earliest;
              }

              if (earliest === null || dream.createdAt < earliest) {
                return dream.createdAt;
              }

              return earliest;
            }, null);
            await setHasCompletedOnboarding(true, earliestCreatedAt);
          }
        }

        if (mounted) {
          setHasCompletedOnboardingState(resolvedCompleted);
        }
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (isBootstrapping) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={hasCompletedOnboarding ? "Home" : "Onboarding"}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Journal" component={JournalScreen} />
      <Stack.Screen name="Playground" component={PlaygroundScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="InterpretationMethodSettings"
        component={InterpretationMethodSettingsScreen}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="DreamInput" component={DreamInputScreen} />
      <Stack.Screen name="DreamMood" component={DreamMoodScreen} />
      <Stack.Screen
        name="DreamInterpretMethod"
        component={DreamInterpretMethodScreen}
      />
      <Stack.Screen name="DreamSummary" component={DreamSummaryScreen} />
    </Stack.Navigator>
  );
}
