import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from "@notifee/react-native";
import { trackAppOpenedFromNotification } from "./tracking";

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

type NotificationOpenSource =
  | "cold_start"
  | "foreground_press"
  | "foreground_action_press";

function buildNotificationOpenDedupKey(
  notificationId: string | null | undefined,
  pressActionId: string | null | undefined,
  source: NotificationOpenSource
) {
  return `${source}:${notificationId ?? "none"}:${pressActionId ?? "none"}`;
}

export function setupNotificationOpenTracking(): () => void {
  const handledOpenKeys = new Set<string>();

  const trackOpenOnce = async ({
    notificationId,
    pressActionId,
    source,
  }: {
    notificationId?: string | null;
    pressActionId?: string | null;
    source: NotificationOpenSource;
  }) => {
    const dedupeKey = buildNotificationOpenDedupKey(
      notificationId,
      pressActionId,
      source
    );
    if (handledOpenKeys.has(dedupeKey)) {
      return;
    }

    handledOpenKeys.add(dedupeKey);
    await trackAppOpenedFromNotification({
      notification_id: notificationId ?? null,
      press_action_id: pressActionId ?? null,
      open_source: source,
    });
  };

  notifee
    .getInitialNotification()
    .then((initialNotification) => {
      if (!initialNotification) return;
      return trackOpenOnce({
        notificationId: initialNotification.notification?.id ?? null,
        pressActionId: initialNotification.pressAction?.id ?? null,
        source: "cold_start",
      });
    })
    .catch(() => {
      // Keep notification tracking non-blocking.
    });

  const unsubscribe = notifee.onForegroundEvent((event) => {
    if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) {
      return;
    }

    trackOpenOnce({
      notificationId: event.detail.notification?.id ?? null,
      pressActionId: event.detail.pressAction?.id ?? null,
      source:
        event.type === EventType.ACTION_PRESS
          ? "foreground_action_press"
          : "foreground_press",
    }).catch(() => {
      // Keep notification tracking non-blocking.
    });
  });

  return () => {
    unsubscribe();
  };
}
