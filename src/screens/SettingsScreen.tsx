import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { BottomTabDock } from "../components/BottomTabDock";
import { t } from "../i18n";
import {
  getSubscriptionStatus,
  openSubscriptionManagement,
  type SubscriptionStatus,
} from "../services/revenuecat";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const EMPTY_SUBSCRIPTION_STATUS: SubscriptionStatus = {
  isPremiumActive: false,
  willRenew: null,
  expirationDate: null,
  unsubscribeDetectedAt: null,
  managementURL: null,
  store: null,
};

function SettingsItem({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-3 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4 active:opacity-90"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-text-primary text-base font-semibold">{title}</Text>
          <Text className="text-text-secondary mt-1 text-sm leading-5">{subtitle}</Text>
        </View>
        <Text className="text-brand-copper text-xl">›</Text>
      </View>
    </Pressable>
  );
}

function formatSubscriptionDate(dateIso: string | null) {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SettingsScreen({ navigation }: Props) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(
    EMPTY_SUBSCRIPTION_STATUS
  );
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [didSubscriptionLoadFail, setDidSubscriptionLoadFail] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      setIsLoadingSubscription(true);
      setDidSubscriptionLoadFail(false);
      const status = await getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch {
      setSubscriptionStatus(EMPTY_SUBSCRIPTION_STATUS);
      setDidSubscriptionLoadFail(true);
    } finally {
      setIsLoadingSubscription(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSubscriptionStatus();
    }, [loadSubscriptionStatus])
  );

  const onOpenPaywall = () => {
    navigation.navigate("Paywall", { entry: "direct" });
  };

  const onOpenSubscriptionManagement = async () => {
    if (isManagingSubscription) return;

    try {
      setIsManagingSubscription(true);
      await openSubscriptionManagement();
    } catch (error: any) {
      const storeHelp =
        Platform.OS === "ios"
          ? t.settings.manageStoreIos
          : t.settings.manageStoreAndroid;
      Alert.alert(
        t.settings.subscriptionTitle,
        `${error?.message ?? t.settings.subscriptionManageError}\n\n${storeHelp}`
      );
    } finally {
      setIsManagingSubscription(false);
    }
  };

  const formattedExpirationDate = formatSubscriptionDate(subscriptionStatus.expirationDate);
  const subscriptionStatusText =
    subscriptionStatus.willRenew === true && formattedExpirationDate
      ? t.settings.subscriptionRenewsOn.replace("{date}", formattedExpirationDate)
      : subscriptionStatus.willRenew === false && formattedExpirationDate
        ? t.settings.subscriptionEndsOn.replace("{date}", formattedExpirationDate)
        : t.settings.subscriptionSubscribed;

  const premiumSubtitle = didSubscriptionLoadFail
    ? t.settings.subscriptionLoadError
    : t.settings.premiumSubtitle;
  const storeManageText =
    Platform.OS === "ios"
      ? t.settings.manageStoreIos
      : t.settings.manageStoreAndroid;

  return (
    <View className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text-primary text-4xl font-semibold">
          {t.settings.title}
        </Text>
        <Text className="text-text-secondary mt-2 text-[15px] leading-6">
          {t.settings.subtitle}
        </Text>

        <View className="mt-6">
          <SettingsItem
            title={t.settings.interpretationTitle}
            subtitle={t.settings.interpretationMenuSubtitle}
            onPress={() => navigation.navigate("InterpretationMethodSettings")}
          />
          <SettingsItem
            title={t.settings.notificationsTitle}
            subtitle={t.settings.notificationsMenuSubtitle}
            onPress={() => navigation.navigate("NotificationSettings")}
          />

          {!subscriptionStatus.isPremiumActive ? (
            <SettingsItem
              title={t.settings.premiumTitle}
              subtitle={premiumSubtitle}
              onPress={onOpenPaywall}
            />
          ) : (
            <View
              className="mt-3 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                elevation: 2,
              }}
            >
              <Text className="text-text-primary text-base font-semibold">
                {t.settings.subscriptionTitle}
              </Text>
              <Text className="text-text-secondary mt-1 text-sm leading-5">
                {subscriptionStatusText}
              </Text>
              <Text className="text-text-secondary mt-2 text-xs leading-5">
                {storeManageText}
              </Text>

              <Pressable
                onPress={onOpenSubscriptionManagement}
                disabled={isManagingSubscription}
                className={[
                  "mt-3 self-start rounded-full border border-border-default px-4 py-2",
                  isManagingSubscription ? "opacity-70" : "active:opacity-90",
                ].join(" ")}
              >
                <View className="flex-row items-center gap-2">
                  {isManagingSubscription ? <ActivityIndicator size="small" /> : null}
                  <Text className="text-text-primary text-sm font-semibold">
                    {t.settings.unsubscribeCta}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {isLoadingSubscription ? (
            <View className="mt-3 self-start">
              <ActivityIndicator />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomTabDock
        activeTab="settings"
        onHomePress={() => navigation.navigate("Home")}
        onJournalPress={() => navigation.navigate("Journal")}
        onSettingsPress={() => {}}
      />
    </View>
  );
}
