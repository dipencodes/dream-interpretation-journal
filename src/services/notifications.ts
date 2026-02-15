import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from "@notifee/react-native";

const CHANNEL_ID = "dream_morning_reminders";
const MORNING_NOTIFICATION_ID = "dream_morning_notification";

function getNextTriggerTimestamp(hour: number, minute: number): number {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

export async function hasNotificationPermission(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (await hasNotificationPermission()) return true;

  const requested = await notifee.requestPermission();
  return (
    requested.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    requested.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function cancelMorningReminder(): Promise<void> {
  await notifee.cancelTriggerNotification(MORNING_NOTIFICATION_ID);
}

export async function scheduleMorningReminder(
  hour: number,
  minute: number
): Promise<void> {
  const channelId = await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Morning reminders",
    importance: AndroidImportance.HIGH,
  });

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: getNextTriggerTimestamp(hour, minute),
    repeatFrequency: RepeatFrequency.DAILY,
    alarmManager: true,
  };

  await notifee.createTriggerNotification(
    {
      id: MORNING_NOTIFICATION_ID,
      title: "Dream reminder",
      body: "Capture your dream while it is still fresh.",
      android: {
        channelId,
        pressAction: { id: "default" },
      },
      ios: {
        sound: "default",
      },
    },
    trigger
  );
}
