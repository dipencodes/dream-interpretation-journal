import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import type { RootStackParamList } from "../navigation/types";
import { REVENUECAT_ENTITLEMENT_ID } from "../config/revenuecat";
import { t } from "../i18n";
import { ensureAnonymousAuth } from "../services/auth";
import {
  getActiveSubscriptionPlanInterval,
  syncRevenueCatUser,
} from "../services/revenuecat";
import {
  trackPaywallClosed,
  trackPaywallViewed,
  trackSubscriptionPurchaseSuccess,
} from "../services/tracking";

type Props = NativeStackScreenProps<RootStackParamList, "Paywall">;

export function PaywallScreen({ navigation }: Props) {
  const [isPresenting, setIsPresenting] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const presentRevenueCatPaywall = useCallback(async () => {
    setIsPresenting(true);
    setLoadError(null);

    try {
      const { uid } = await ensureAnonymousAuth();
      await syncRevenueCatUser(uid);
      await trackPaywallViewed();

      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
        displayCloseButton: true,
      });

      if (paywallResult === PAYWALL_RESULT.PURCHASED) {
        let planInterval: "weekly" | "monthly" | "yearly" | "unknown" = "unknown";
        try {
          planInterval = await getActiveSubscriptionPlanInterval();
        } catch {
          planInterval = "unknown";
        }
        await trackSubscriptionPurchaseSuccess(planInterval);
        Alert.alert(
          t.paywall.successTitle,
          t.paywall.successMessage,
          [
            {
              text: t.paywall.successOkCta,
              onPress: () => navigation.goBack(),
            },
          ],
          { cancelable: false }
        );
        return;
      }

      if (paywallResult === PAYWALL_RESULT.RESTORED) {
        await trackPaywallClosed({ result: "restored" });
        navigation.goBack();
        return;
      }

      if (paywallResult === PAYWALL_RESULT.CANCELLED) {
        await trackPaywallClosed({ result: "cancelled" });
        navigation.goBack();
        return;
      }

      if (paywallResult === PAYWALL_RESULT.NOT_PRESENTED) {
        await trackPaywallClosed({ result: "not_presented" });
        navigation.goBack();
        return;
      }

      await trackPaywallClosed({ result: "unknown" });
      setLoadError(t.paywall.loadError);
    } catch (error: any) {
      setLoadError(error?.message ?? t.paywall.loadError);
    } finally {
      setIsPresenting(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      presentRevenueCatPaywall();
    }, [presentRevenueCatPaywall])
  );

  return (
    <View className="flex-1 bg-bg-base">
      <View pointerEvents="none" className="absolute inset-0">
        <View
          style={{
            position: "absolute",
            top: -120,
            left: -90,
            width: 260,
            height: 260,
            borderRadius: 9999,
            backgroundColor: "#F28C28",
            opacity: 0.1,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 120,
            right: -100,
            width: 260,
            height: 260,
            borderRadius: 9999,
            backgroundColor: "#FFD6A8",
            opacity: 0.16,
          }}
        />
      </View>

      <View className="flex-1 px-6 pt-14">
        <Text className="mt-5 text-text-primary text-4xl font-semibold">{t.paywall.title}</Text>
        <Text className="mt-3 text-text-secondary text-[15px] leading-6">
          {t.paywall.subtitle}
        </Text>

        {isPresenting ? (
          <View className="items-center py-10">
            <ActivityIndicator />
          </View>
        ) : null}

        {loadError ? (
          <View className="mt-5 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4">
            <Text className="text-text-secondary text-sm leading-6">{loadError}</Text>
            <Pressable onPress={presentRevenueCatPaywall} className="mt-3 self-start">
              <Text className="text-brand-copper text-sm font-semibold">{t.paywall.retryCta}</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-5 self-center"
          disabled={isPresenting}
        >
          <Text className="text-text-secondary text-sm font-semibold">{t.paywall.notNowCta}</Text>
        </Pressable>
      </View>
    </View>
  );
}
