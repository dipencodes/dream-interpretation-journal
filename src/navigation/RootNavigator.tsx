import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";

import { OnboardingScreen } from "../screens/OnboardingScreen";
import { DreamInputScreen } from "../screens/DreamInputScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="DreamInput" component={DreamInputScreen} />
    </Stack.Navigator>
  );
}
