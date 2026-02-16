import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
} from "../services/notificationPreferences";
import {
  cancelMorningReminder,
  ensureNotificationPermission,
  scheduleMorningReminder,
} from "../services/notifications";
import { trackNotificationOptInChanged } from "../services/tracking";
import { t } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationSettings">;

function formatTime(hour: number, minute: number) {
  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minutePadded = minute.toString().padStart(2, "0");
  return `${hour12}:${minutePadded} ${meridiem}`;
}

export function NotificationSettingsScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    morningEnabled: false,
    morningHour: 7,
    morningMinute: 0,
  });

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const current = await getNotificationPreferences();
      setPreferences(current);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  const timeValue = useMemo(() => {
    const date = new Date();
    date.setHours(preferences.morningHour, preferences.morningMinute, 0, 0);
    return date;
  }, [preferences.morningHour, preferences.morningMinute]);

  const persistPreferences = async (next: NotificationPreferences) => {
    setPreferences(next);
    await setNotificationPreferences(next);
  };

  const onToggleMorningNotifications = async (enabled: boolean) => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      if (enabled) {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          Alert.alert(
            t.notifications.permissionTitle,
            t.notifications.permissionDeniedMessage
          );
          return;
        }
      }

      const next: NotificationPreferences = {
        ...preferences,
        morningEnabled: enabled,
      };

      if (enabled) {
        await scheduleMorningReminder(next.morningHour, next.morningMinute);
        await persistPreferences(next);
        await trackNotificationOptInChanged({
          enabled: true,
          hour: next.morningHour,
          minute: next.morningMinute,
        });
      } else {
        await cancelMorningReminder();
        await persistPreferences(next);
        await trackNotificationOptInChanged({
          enabled: false,
          hour: next.morningHour,
          minute: next.morningMinute,
        });
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? t.notifications.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const onChangeTime = async (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (!date) return;

    const next: NotificationPreferences = {
      ...preferences,
      morningHour: date.getHours(),
      morningMinute: date.getMinutes(),
    };

    try {
      setIsSaving(true);
      await persistPreferences(next);
      if (next.morningEnabled) {
        await scheduleMorningReminder(next.morningHour, next.morningMinute);
      }
      if (Platform.OS === "ios" && event.type === "set") {
        setShowTimePicker(false);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? t.notifications.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-bg-surface active:opacity-90"
        >
          <Text className="text-text-primary text-2xl">‹</Text>
        </Pressable>

        <Text className="text-text-primary mt-5 text-5xl font-semibold">
          {t.notifications.title}
        </Text>
        <Text className="text-text-secondary mt-3 text-[15px] leading-8">
          {t.notifications.subtitle}
        </Text>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <View
              className="mt-8 rounded-3xl border border-border-subtle bg-bg-surface px-5 py-5"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 3,
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-text-primary text-3xl font-semibold">
                  {t.notifications.morningToggleLabel}
                </Text>
                <Switch
                  value={preferences.morningEnabled}
                  onValueChange={onToggleMorningNotifications}
                  trackColor={{ false: "#A3A3A3", true: "#D97706" }}
                  thumbColor="#FFFFFF"
                  disabled={isSaving}
                />
              </View>
            </View>

            <Pressable
              onPress={() => setShowTimePicker((prev) => !prev)}
              className="mt-4 rounded-3xl border border-border-subtle bg-bg-surface px-5 py-5 active:opacity-90"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 3,
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-text-primary text-3xl font-semibold">
                  {t.notifications.timeLabel}
                </Text>
                <View className="rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-2">
                  <Text className="text-text-primary text-2xl font-semibold">
                    {formatTime(preferences.morningHour, preferences.morningMinute)}
                  </Text>
                </View>
              </View>
            </Pressable>

            {showTimePicker ? (
              <View className="mt-3 rounded-2xl border border-border-subtle bg-bg-surface px-2 py-3">
                <DateTimePicker
                  mode="time"
                  value={timeValue}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onChangeTime}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
