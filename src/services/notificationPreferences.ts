import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATION_SETTINGS_KEY = "notification_settings";

export type NotificationPreferences = {
  morningEnabled: boolean;
  morningHour: number;
  morningMinute: number;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  morningEnabled: false,
  morningHour: 7,
  morningMinute: 0,
};

function isValidHour(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 23;
}

function isValidMinute(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 59;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
  if (!raw) return DEFAULT_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      morningEnabled: Boolean(parsed.morningEnabled),
      morningHour: isValidHour(parsed.morningHour ?? NaN)
        ? (parsed.morningHour as number)
        : DEFAULT_PREFERENCES.morningHour,
      morningMinute: isValidMinute(parsed.morningMinute ?? NaN)
        ? (parsed.morningMinute as number)
        : DEFAULT_PREFERENCES.morningMinute,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function setNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(preferences));
}
