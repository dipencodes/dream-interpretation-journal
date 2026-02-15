import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";

import { OnboardingScreen } from "../screens/OnboardingScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { JournalScreen } from "../screens/JournalScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { InterpretationMethodSettingsScreen } from "../screens/InterpretationMethodSettingsScreen";
import { NotificationSettingsScreen } from "../screens/NotificationSettingsScreen";
import { DreamInputScreen } from "../screens/DreamInputScreen";
import { DreamMoodScreen } from "../screens/DreamMoodScreen";
import { DreamInterpretMethodScreen } from "../screens/DreamInterpretMethodScreen";
import { DreamSummaryScreen } from "../screens/DreamSummaryScreen";
import { getHasCompletedOnboarding } from "../services/appPreferences";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const completed = await getHasCompletedOnboarding();
        if (mounted) {
          setHasCompletedOnboarding(completed);
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
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="InterpretationMethodSettings"
        component={InterpretationMethodSettingsScreen}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
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
