import "./global.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import type { RootStackParamList } from "./src/navigation/types";
import { ensureAnonymousAuth } from "./src/services/auth";
import {
  configureRevenueCat,
  setRevenueCatFacebookAnonymousId,
  syncRevenueCatUser,
} from "./src/services/revenuecat";
import { setupNotificationOpenTracking } from "./src/services/notifications";
import { getMetaAnonymousId, initializeMetaSdk } from "./src/services/metaAttribution";
import { setTrackingUser } from "./src/services/tracking";
import { AnimatedSplashScreen } from "./src/components/AnimatedSplashScreen";

const SPLASH_LOGO = require("./assets/images/dream.png");
const MIN_SPLASH_DURATION_MS = 1400;
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const pendingHomeNavigationRef = useRef(false);

  const navigateHomeFromNotification = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate("Home");
      return;
    }
    pendingHomeNavigationRef.current = true;
  }, []);

  const onNavigationReady = useCallback(() => {
    if (!pendingHomeNavigationRef.current) {
      return;
    }
    pendingHomeNavigationRef.current = false;
    navigationRef.navigate("Home");
  }, []);

  useEffect(() => {
    const unsubscribe = setupNotificationOpenTracking(navigateHomeFromNotification);
    return unsubscribe;
  }, [navigateHomeFromNotification]);

  useEffect(() => {
    let mounted = true;
    const startedAt = Date.now();

    (async () => {
      try {
        const { uid } = await ensureAnonymousAuth();
        await setTrackingUser(uid);
        await initializeMetaSdk();
        await configureRevenueCat();
        await syncRevenueCatUser(uid);

        const fbAnonymousId = await getMetaAnonymousId();
        if (fbAnonymousId) {
          await setRevenueCatFacebookAnonymousId(fbAnonymousId);
        }
      } catch {
        // RevenueCat setup can fail locally until SDK keys are configured.
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - elapsed);

        if (remaining > 0) {
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), remaining);
          });
        }

        if (mounted) {
          setIsAppReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
        <RootNavigator />
      </NavigationContainer>
      {showSplash ? (
        <AnimatedSplashScreen
          logoSource={SPLASH_LOGO}
          isReady={isAppReady}
          onFinished={() => setShowSplash(false)}
        />
      ) : null}
    </SafeAreaProvider>
  );
}
