import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from "react-native-google-mobile-ads";
import type { RootStackParamList } from "../navigation/types";
import { REVENUECAT_ENTITLEMENT_ID } from "../config/revenuecat";
import { getRewardedAdUnitId } from "../config/admob";
import { t } from "../i18n";
import { ensureAnonymousAuth } from "../services/auth";
import {
  getActiveSubscriptionPlanInterval,
  syncRevenueCatUser,
} from "../services/revenuecat";
import {
  getFreeCreditStatus,
  grantRewardedCredit,
} from "../services/paywallGate";
import {
  normalizeTrackingErrorCode,
  trackPaywallClosed,
  trackPaywallCheckoutStarted,
  trackPaywallRewardedOptionViewed,
  trackPaywallViewed,
  trackRewardedAdCapReached,
  trackRewardedAdLoadFailed,
  trackRewardedAdLoadSucceeded,
  trackRewardedCreditGranted,
  trackRewardedAdRewardEarned,
  trackRewardedAdShowFailed,
  trackRewardedAdShowSucceeded,
  trackSubscriptionPurchaseSuccess,
} from "../services/tracking";
import { ensureMetaTrackingConsentBeforePaywall } from "../services/metaAttribution";
import { markPaywallContinuationRewarded } from "../services/paywallContinuation";
import { initializeAdMobSdk } from "../services/adMob";

type Props = NativeStackScreenProps<RootStackParamList, "Paywall">;

type RewardedOutcome = "earned" | "closed_without_reward";

function formatResetTime(unixMs: number): string {
  try {
    return new Date(unixMs).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function loadRewardedAd(ad: ReturnType<typeof RewardedAd.createForAdRequest>): Promise<void> {
  return new Promise((resolve, reject) => {
    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      unsubscribeLoaded();
      unsubscribeError();
      resolve();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      unsubscribeLoaded();
      unsubscribeError();
      reject(error ?? new Error("rewarded_load_failed"));
    });

    ad.load();
  });
}

function showRewardedAdAndWaitForOutcome(
  ad: ReturnType<typeof RewardedAd.createForAdRequest>,
  onShowSucceeded: () => void
): Promise<RewardedOutcome> {
  return new Promise((resolve, reject) => {
    let didEarnReward = false;

    const unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      didEarnReward = true;
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      resolve(didEarnReward ? "earned" : "closed_without_reward");
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      reject(error ?? new Error("rewarded_show_failed"));
    });

    (async () => {
      try {
        await ad.show();
        onShowSucceeded();
      } catch (error) {
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
        reject(error);
      }
    })();
  });
}

export function PaywallScreen({ navigation, route }: Props) {
  const isDirectEntry = route.params?.entry === "direct";
  const isRewardEntry = route.params?.entry === "reward";
  const rewardTrackingEntry: "gate" | "reward" | "unknown" =
    route.params?.entry === "reward"
      ? "reward"
      : route.params?.entry === "gate"
        ? "gate"
        : "unknown";
  const continuationToken = route.params?.continuationToken;

  const [isPresentingPremium, setIsPresentingPremium] = useState(isDirectEntry);
  const [isRewarding, setIsRewarding] = useState(false);
  const [premiumError, setPremiumError] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [totalFreeCredits, setTotalFreeCredits] = useState<number | null>(null);
  const [rewardRemainingToday, setRewardRemainingToday] = useState<number | null>(null);
  const [rewardResetsAt, setRewardResetsAt] = useState<number | null>(null);

  const refreshFreeCreditStatus = useCallback(async () => {
    if (isDirectEntry) return;

    try {
      const { uid } = await ensureAnonymousAuth();
      const status = await getFreeCreditStatus(uid);
      setIsPremiumUser(status.isPremium);
      setTotalFreeCredits(status.totalFreeCreditsAvailable);
      setRewardRemainingToday(status.remainingDailyRewarded);
      setRewardResetsAt(status.rewardedResetsAt);
    } catch {
      setIsPremiumUser(false);
      setTotalFreeCredits(null);
      setRewardRemainingToday(null);
      setRewardResetsAt(null);
    }
  }, [isDirectEntry]);

  const presentRevenueCatPaywall = useCallback(async () => {
    setIsPresentingPremium(true);
    setPremiumError(null);

    try {
      await ensureMetaTrackingConsentBeforePaywall();
      await trackPaywallCheckoutStarted();

      const { uid } = await ensureAnonymousAuth();
      await syncRevenueCatUser(uid);

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
        if (isDirectEntry) {
          navigation.goBack();
        }
        return;
      }

      if (paywallResult === PAYWALL_RESULT.NOT_PRESENTED) {
        await trackPaywallClosed({ result: "not_presented" });
        if (isDirectEntry) {
          navigation.goBack();
        }
        return;
      }

      await trackPaywallClosed({ result: "unknown" });
      setPremiumError(t.paywall.loadError);
    } catch (error: any) {
      setPremiumError(error?.message ?? t.paywall.loadError);
    } finally {
      setIsPresentingPremium(false);
    }
  }, [isDirectEntry, navigation]);

  const onWatchRewardedAd = useCallback(async () => {
    if (isDirectEntry || isRewarding || isPresentingPremium) return;

    setIsRewarding(true);
    setRewardError(null);

    let didLoad = false;
    let didShow = false;

    try {
      const { uid } = await ensureAnonymousAuth();
      await initializeAdMobSdk();

      const status = await getFreeCreditStatus(uid);
      setIsPremiumUser(status.isPremium);
      setTotalFreeCredits(status.totalFreeCreditsAvailable);
      setRewardRemainingToday(status.remainingDailyRewarded);
      setRewardResetsAt(status.rewardedResetsAt);

      if (status.remainingDailyRewarded <= 0) {
        await trackRewardedAdCapReached({ resets_at_unix_ms: status.rewardedResetsAt });
        setRewardError(
          `${t.paywall.rewardedCapReachedMessage} ${t.paywall.rewardedResetsAtLabel} ${formatResetTime(
            status.rewardedResetsAt
          )}.`
        );
        return;
      }

      const rewardedAd = RewardedAd.createForAdRequest(getRewardedAdUnitId());
      await loadRewardedAd(rewardedAd);
      didLoad = true;
      await trackRewardedAdLoadSucceeded();

      const outcome = await showRewardedAdAndWaitForOutcome(rewardedAd, () => {
        didShow = true;
      });

      if (didShow) {
        await trackRewardedAdShowSucceeded();
      }

      if (outcome !== "earned") {
        setRewardError(t.paywall.rewardedNotEarnedMessage);
        return;
      }

      const rewardGrantResult = await grantRewardedCredit(uid);

      if (!rewardGrantResult.granted) {
        if (rewardGrantResult.reason === "daily_cap_reached") {
          await trackRewardedAdCapReached({
            resets_at_unix_ms: rewardGrantResult.resetsAt,
          });
          setRewardError(
            `${t.paywall.rewardedCapReachedMessage} ${t.paywall.rewardedResetsAtLabel} ${formatResetTime(
              rewardGrantResult.resetsAt
            )}.`
          );
          return;
        }

        setRewardError(t.paywall.rewardedGrantError);
        return;
      }

      await trackRewardedAdRewardEarned();
      await trackRewardedCreditGranted({
        entry: rewardTrackingEntry,
        remaining_daily_rewarded: rewardGrantResult.remainingDaily,
      });
      setRewardRemainingToday(rewardGrantResult.remainingDaily);

      if (continuationToken) {
        await markPaywallContinuationRewarded(continuationToken);
      }

      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      }
    } catch (error) {
      const errorCode = normalizeTrackingErrorCode(error);
      if (!didLoad) {
        await trackRewardedAdLoadFailed({ error_code: errorCode });
      } else {
        await trackRewardedAdShowFailed({ error_code: errorCode });
      }
      setRewardError(t.paywall.rewardedLoadError);
    } finally {
      setIsRewarding(false);
      await refreshFreeCreditStatus();
    }
  }, [
    continuationToken,
    isDirectEntry,
    isPresentingPremium,
    isRewarding,
    navigation,
    rewardTrackingEntry,
    refreshFreeCreditStatus,
  ]);

  useFocusEffect(
    useCallback(() => {
      trackPaywallViewed();

      if (isDirectEntry) {
        presentRevenueCatPaywall();
        return;
      }

      trackPaywallRewardedOptionViewed();
      refreshFreeCreditStatus();
    }, [isDirectEntry, presentRevenueCatPaywall, refreshFreeCreditStatus])
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
        {!isDirectEntry ? (
          <>
            <Text className="mt-5 text-text-primary text-4xl font-semibold">
              {isRewardEntry ? t.paywall.rewardEntryTitle : t.paywall.title}
            </Text>
            <Text className="mt-3 text-text-secondary text-[15px] leading-6">
              {isRewardEntry ? t.paywall.rewardEntrySubtitle : t.paywall.subtitle}
            </Text>
            {!isRewardEntry ? (
              <View className="mt-4 rounded-2xl border border-brand-primary/35 bg-brand-primary/10 px-4 py-3">
                <Text className="text-brand-copper text-sm font-semibold">
                  {t.paywall.weeklyFreeBannerTitle}
                </Text>
                <Text className="mt-1 text-text-secondary text-sm leading-5">
                  {t.paywall.weeklyFreeBannerSubtitle}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {isPresentingPremium ? (
          <View
            className={isDirectEntry ? "items-center justify-center py-16" : "items-center py-8"}
          >
            <ActivityIndicator />
          </View>
        ) : null}

        {!isDirectEntry ? (
          <>
            <Pressable
              onPress={onWatchRewardedAd}
              disabled={isRewarding || isPresentingPremium}
              className={[
                "mt-7 items-center rounded-full border border-brand-primary bg-bg-surface px-5 py-3 active:opacity-90",
                isRewarding || isPresentingPremium ? "opacity-70" : "",
              ].join(" ")}
            >
              <Text className="text-brand-copper text-base font-semibold">
                {isRewarding ? t.paywall.watchRewardLoadingCta : t.paywall.watchRewardCta}
              </Text>
            </Pressable>

            {totalFreeCredits !== null ? (
              <Text className="mt-2 text-text-secondary text-xs">
                {t.paywall.totalFreeCreditsLabel}{" "}
                {isPremiumUser ? t.settings.creditsUnlimited : totalFreeCredits}
              </Text>
            ) : null}

            {rewardRemainingToday !== null ? (
              <Text className="mt-2 text-text-secondary text-xs">
                {t.paywall.dailyRewardedRemainingLabel} {rewardRemainingToday}
              </Text>
            ) : null}

            {!isRewardEntry ? (
              <Pressable
                onPress={presentRevenueCatPaywall}
                disabled={isPresentingPremium || isRewarding}
                className={[
                  "mt-4 items-center rounded-full bg-brand-primary px-5 py-3 active:opacity-90",
                  isPresentingPremium || isRewarding ? "opacity-70" : "",
                ].join(" ")}
              >
                <Text className="text-text-inverse text-base font-semibold">
                  {t.paywall.explorePremiumCta}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => navigation.goBack()}
              className="mt-4 items-center rounded-full border border-border-default bg-bg-surface px-5 py-3 active:opacity-90"
              disabled={isPresentingPremium || isRewarding}
            >
              <Text className="text-text-secondary text-sm font-semibold">
                {t.paywall.keepUsingFreeCta}
              </Text>
            </Pressable>
          </>
        ) : null}

        {rewardError ? (
          <View className="mt-5 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4">
            <Text className="text-text-secondary text-sm leading-6">{rewardError}</Text>
          </View>
        ) : null}

        {premiumError ? (
          <View className="mt-5 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4">
            <Text className="text-text-secondary text-sm leading-6">{premiumError}</Text>
            <Pressable onPress={presentRevenueCatPaywall} className="mt-3 self-start">
              <Text className="text-brand-copper text-sm font-semibold">{t.paywall.retryCta}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isDirectEntry && rewardResetsAt && rewardRemainingToday === 0 ? (
          <Text className="mt-4 text-text-secondary text-xs">
            {t.paywall.rewardedResetsAtLabel} {formatResetTime(rewardResetsAt)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
