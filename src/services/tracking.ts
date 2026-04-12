import analytics from "@react-native-firebase/analytics";
import {
  logMetaFunnelEvent,
  type MetaTrackingParams,
  setMetaUserId,
} from "./metaAttribution";

export type TrackingPlanInterval = "weekly" | "monthly" | "yearly" | "unknown";

export type TrackingEventName =
  | "subscription_purchase_success_weekly"
  | "subscription_purchase_success_monthly"
  | "subscription_purchase_success_yearly"
  | "subscription_purchase_success_unknown"
  | "onboarding_completed_first_dream_saved"
  | "app_opened_from_notification"
  | "paywall_viewed"
  | "paywall_checkout_started"
  | "paywall_closed"
  | "paywall_rewarded_option_viewed"
  | "rewarded_ad_load_succeeded"
  | "rewarded_ad_load_failed"
  | "rewarded_ad_show_succeeded"
  | "rewarded_ad_show_failed"
  | "rewarded_ad_reward_earned"
  | "rewarded_ad_cap_reached"
  | "rewarded_auto_resume_succeeded"
  | "rewarded_auto_resume_failed"
  | "dream_saved"
  | "interpretation_started"
  | "interpretation_succeeded"
  | "interpretation_failed"
  | "notification_opt_in_changed";

export type TrackingParamValue = string | number | boolean | null | undefined;
export type TrackingParams = Record<string, TrackingParamValue>;

type SanitizedTrackingParams = Record<string, string | number | boolean>;

interface TrackingProvider {
  setUserId(userId: string): Promise<void>;
  logEvent(name: TrackingEventName, params?: TrackingParams): Promise<void>;
}

const firebaseTrackingProvider: TrackingProvider = {
  async setUserId(userId: string): Promise<void> {
    await analytics().setUserId(userId);
  },

  async logEvent(name: TrackingEventName, params?: TrackingParams): Promise<void> {
    const sanitized = sanitizeTrackingParams(params);
    await analytics().logEvent(name, sanitized);
  },
};

const metaTrackingProvider: TrackingProvider = {
  async setUserId(userId: string): Promise<void> {
    await setMetaUserId(userId);
  },

  async logEvent(name: TrackingEventName, params?: TrackingParams): Promise<void> {
    if (name !== "paywall_viewed" && name !== "paywall_checkout_started") {
      return;
    }

    await logMetaFunnelEvent(name, params as MetaTrackingParams);
  },
};

const providers: TrackingProvider[] = [firebaseTrackingProvider, metaTrackingProvider];

function sanitizeTrackingParams(params?: TrackingParams): SanitizedTrackingParams {
  if (!params) return {};

  const sanitized: SanitizedTrackingParams = {};

  Object.entries(params).forEach(([key, value]) => {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

async function safeSetUserId(userId: string): Promise<void> {
  await Promise.all(
    providers.map(async (provider) => {
      try {
        await provider.setUserId(userId);
      } catch {
        // Analytics must never block app behavior.
      }
    })
  );
}

async function safeLogEvent(
  name: TrackingEventName,
  params?: TrackingParams
): Promise<void> {
  await Promise.all(
    providers.map(async (provider) => {
      try {
        await provider.logEvent(name, params);
      } catch {
        // Analytics must never block app behavior.
      }
    })
  );
}

export function normalizeTrackingErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown_error";

  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === "string" && maybeCode.trim()) {
    return maybeCode.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  }

  return "unknown_error";
}

export async function setTrackingUser(uid: string): Promise<void> {
  await safeSetUserId(uid);
}

export async function trackSubscriptionPurchaseSuccess(
  plan: TrackingPlanInterval
): Promise<void> {
  const eventNameByPlan: Record<TrackingPlanInterval, TrackingEventName> = {
    weekly: "subscription_purchase_success_weekly",
    monthly: "subscription_purchase_success_monthly",
    yearly: "subscription_purchase_success_yearly",
    unknown: "subscription_purchase_success_unknown",
  };

  await safeLogEvent(eventNameByPlan[plan]);
}

export async function trackOnboardingCompletedFirstDreamSaved(): Promise<void> {
  await safeLogEvent("onboarding_completed_first_dream_saved");
}

export async function trackAppOpenedFromNotification(params: {
  notification_id?: string | null;
  press_action_id?: string | null;
  open_source: "cold_start" | "foreground_press" | "foreground_action_press";
}): Promise<void> {
  await safeLogEvent("app_opened_from_notification", params);
}

export async function trackPaywallViewed(): Promise<void> {
  await safeLogEvent("paywall_viewed");
}

export async function trackPaywallCheckoutStarted(): Promise<void> {
  await safeLogEvent("paywall_checkout_started");
}

export async function trackPaywallClosed(params: {
  result: "cancelled" | "not_presented" | "restored" | "unknown";
}): Promise<void> {
  await safeLogEvent("paywall_closed", params);
}

export async function trackPaywallRewardedOptionViewed(): Promise<void> {
  await safeLogEvent("paywall_rewarded_option_viewed");
}

export async function trackRewardedAdLoadSucceeded(): Promise<void> {
  await safeLogEvent("rewarded_ad_load_succeeded");
}

export async function trackRewardedAdLoadFailed(params: {
  error_code: string;
}): Promise<void> {
  await safeLogEvent("rewarded_ad_load_failed", params);
}

export async function trackRewardedAdShowSucceeded(): Promise<void> {
  await safeLogEvent("rewarded_ad_show_succeeded");
}

export async function trackRewardedAdShowFailed(params: {
  error_code: string;
}): Promise<void> {
  await safeLogEvent("rewarded_ad_show_failed", params);
}

export async function trackRewardedAdRewardEarned(): Promise<void> {
  await safeLogEvent("rewarded_ad_reward_earned");
}

export async function trackRewardedAdCapReached(params: {
  resets_at_unix_ms: number;
}): Promise<void> {
  await safeLogEvent("rewarded_ad_cap_reached", params);
}

export async function trackRewardedAutoResumeSucceeded(params: {
  source_screen: "dream_mood" | "dream_interpret_method" | "dream_summary";
}): Promise<void> {
  await safeLogEvent("rewarded_auto_resume_succeeded", params);
}

export async function trackRewardedAutoResumeFailed(params: {
  source_screen: "dream_mood" | "dream_interpret_method" | "dream_summary";
  error_code: string;
}): Promise<void> {
  await safeLogEvent("rewarded_auto_resume_failed", params);
}

export async function trackDreamSaved(params: {
  has_interpretation: boolean;
  source_key: string;
  has_mood: boolean;
}): Promise<void> {
  await safeLogEvent("dream_saved", params);
}

export async function trackInterpretationStarted(params: {
  method: string;
  source_screen: "dream_mood" | "dream_interpret_method" | "dream_summary";
}): Promise<void> {
  await safeLogEvent("interpretation_started", params);
}

export async function trackInterpretationSucceeded(params: {
  method: string;
  source_screen: "dream_mood" | "dream_interpret_method" | "dream_summary";
}): Promise<void> {
  await safeLogEvent("interpretation_succeeded", params);
}

export async function trackInterpretationFailed(params: {
  method: string;
  source_screen: "dream_mood" | "dream_interpret_method" | "dream_summary";
  error_code: string;
}): Promise<void> {
  await safeLogEvent("interpretation_failed", params);
}

export async function trackNotificationOptInChanged(params: {
  enabled: boolean;
  hour: number;
  minute: number;
}): Promise<void> {
  await safeLogEvent("notification_opt_in_changed", params);
}
