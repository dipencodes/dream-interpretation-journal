import "./global.css";
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ensureAnonymousAuth } from "./src/services/auth";
import { configureRevenueCat, syncRevenueCatUser } from "./src/services/revenuecat";
import { setupNotificationOpenTracking } from "./src/services/notifications";
import { setTrackingUser } from "./src/services/tracking";

export default function App() {
  useEffect(() => {
    const unsubscribe = setupNotificationOpenTracking();
    return unsubscribe;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { uid } = await ensureAnonymousAuth();
        await setTrackingUser(uid);
        await configureRevenueCat();
        await syncRevenueCatUser(uid);
      } catch {
        // RevenueCat setup can fail locally until SDK keys are configured.
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
