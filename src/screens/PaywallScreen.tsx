import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import type { RootStackParamList } from "../navigation/types";
import { t } from "../i18n";
import { ensureAnonymousAuth } from "../services/auth";
import {
  getCurrentOfferingPackages,
  purchasePlan,
  restorePurchases,
  syncRevenueCatUser,
} from "../services/revenuecat";

type Props = NativeStackScreenProps<RootStackParamList, "Paywall">;
type PlanKey = "weekly" | "monthly" | "yearly";

const PLAN_ORDER: PlanKey[] = ["weekly", "monthly", "yearly"];

export function PaywallScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [packages, setPackages] = useState<Record<PlanKey, PurchasesPackage | undefined>>({
    weekly: undefined,
    monthly: undefined,
    yearly: undefined,
  });

  const loadOfferings = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const { uid } = await ensureAnonymousAuth();
      await syncRevenueCatUser(uid);
      const offeringPackages = await getCurrentOfferingPackages();
      const nextPackages: Record<PlanKey, PurchasesPackage | undefined> = {
        weekly: offeringPackages.weekly,
        monthly: offeringPackages.monthly,
        yearly: offeringPackages.yearly,
      };
      setPackages(nextPackages);

      const firstAvailable = PLAN_ORDER.find((key) => Boolean(nextPackages[key])) ?? null;
      if (!firstAvailable) {
        setSelectedPlan(null);
        setLoadError(t.paywall.offeringUnavailable);
      } else {
        setSelectedPlan((current) => (current && nextPackages[current] ? current : firstAvailable));
      }
    } catch (error: any) {
      setLoadError(error?.message ?? t.paywall.loadError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOfferings();
    }, [loadOfferings])
  );

  const selectedPackage = useMemo(() => {
    if (!selectedPlan) return null;
    return packages[selectedPlan] ?? null;
  }, [packages, selectedPlan]);

  const canSubscribe = Boolean(selectedPackage) && !isLoading && !isPurchasing && !isRestoring;

  const onSubscribe = async () => {
    if (!selectedPackage || isPurchasing || isRestoring) return;

    try {
      setIsPurchasing(true);
      const result = await purchasePlan(selectedPackage);
      if (result.isPremium) {
        navigation.goBack();
        return;
      }
      Alert.alert(t.paywall.errorTitle, t.paywall.purchaseNotActiveMessage);
    } catch (error: any) {
      const isCancelled =
        error?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
        error?.userCancelled === true;
      if (!isCancelled) {
        Alert.alert(t.paywall.errorTitle, error?.message ?? t.paywall.purchaseError);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const onRestore = async () => {
    if (isRestoring || isPurchasing) return;
    try {
      setIsRestoring(true);
      const result = await restorePurchases();
      if (result.isPremium) {
        navigation.goBack();
        return;
      }
      Alert.alert(t.paywall.errorTitle, t.paywall.restoreNoActiveSubMessage);
    } catch (error: any) {
      Alert.alert(t.paywall.errorTitle, error?.message ?? t.paywall.restoreError);
    } finally {
      setIsRestoring(false);
    }
  };

  const getPlanTitle = (plan: PlanKey) => {
    if (plan === "weekly") return t.paywall.planWeekly;
    if (plan === "monthly") return t.paywall.planMonthly;
    return t.paywall.planYearly;
  };

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

      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-bg-surface active:opacity-90"
        >
          <Text className="text-text-primary text-2xl">‹</Text>
        </Pressable>

        <Text className="mt-5 text-text-primary text-4xl font-semibold">{t.paywall.title}</Text>
        <Text className="mt-3 text-text-secondary text-[15px] leading-6">
          {t.paywall.subtitle}
        </Text>

        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator />
          </View>
        ) : null}

        {loadError ? (
          <View className="mt-5 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4">
            <Text className="text-text-secondary text-sm leading-6">{loadError}</Text>
            <Pressable onPress={loadOfferings} className="mt-3 self-start">
              <Text className="text-brand-copper text-sm font-semibold">{t.paywall.retryCta}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !loadError ? (
          <View className="mt-6">
            {PLAN_ORDER.map((plan) => {
              const pkg = packages[plan];
              if (!pkg) return null;
              const selected = selectedPlan === plan;
              return (
                <Pressable
                  key={plan}
                  onPress={() => setSelectedPlan(plan)}
                  className={[
                    "mt-3 rounded-3xl border bg-bg-surface px-5 py-5 active:opacity-90",
                    selected ? "border-brand-primary" : "border-border-subtle",
                  ].join(" ")}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-text-primary text-lg font-semibold">{getPlanTitle(plan)}</Text>
                    <Text className="text-text-primary text-base font-semibold">
                      {pkg.product.priceString}
                    </Text>
                  </View>
                  <Text className="mt-1 text-text-secondary text-sm">
                    {pkg.product.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Pressable
          onPress={onSubscribe}
          disabled={!canSubscribe}
          className={[
            "mt-7 rounded-full px-6 py-4 flex-row items-center justify-center gap-2",
            canSubscribe ? "bg-brand-primary active:opacity-90" : "bg-border-default opacity-70",
          ].join(" ")}
        >
          {isPurchasing ? <ActivityIndicator /> : null}
          <Text className="text-text-inverse text-base font-semibold">{t.paywall.subscribeCta}</Text>
        </Pressable>

        <Pressable
          onPress={onRestore}
          disabled={isRestoring || isPurchasing}
          className="mt-4 self-center"
        >
          <Text className="text-brand-copper text-sm font-semibold">
            {isRestoring ? t.paywall.restoringLabel : t.paywall.restoreCta}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-5 self-center"
          disabled={isPurchasing || isRestoring}
        >
          <Text className="text-text-secondary text-sm font-semibold">{t.paywall.notNowCta}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

