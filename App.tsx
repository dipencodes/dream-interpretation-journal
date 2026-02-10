import "./global.css";
import React from "react";
import { Alert } from "react-native";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";

export default function App() {
  return (
    <OnboardingScreen
      onNext={(details) => {
        Alert.alert("Next (placeholder)", JSON.stringify(details, null, 2));
      }}
    />
  );
}
