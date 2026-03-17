import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { AppEventsLogger, Settings } from "react-native-fbsdk-next";
import {
  getTrackingStatus,
  requestTrackingPermission,
  type TrackingStatus,
} from "react-native-tracking-transparency";

type MetaTrackingParamValue = string | number | boolean | null | undefined;
export type MetaTrackingParams = Record<string, MetaTrackingParamValue>;

const META_ATT_PROMPTED_KEY = "meta_att_prompted_before_paywall";

let isMetaSdkInitialized = false;

function sanitizeParams(params?: MetaTrackingParams): Record<string, string | number> {
  if (!params) return {};

  const sanitized: Record<string, string | number> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

async function applyAdvertiserTrackingFromStatus(status: TrackingStatus): Promise<void> {
  const isAuthorized = status === "authorized";

  try {
    await Settings.setAdvertiserTrackingEnabled(isAuthorized);
  } catch {
    // iOS-only API can fail on unsupported platforms/versions.
  }

  Settings.setAdvertiserIDCollectionEnabled(isAuthorized);
}

export async function initializeMetaSdk(): Promise<void> {
  if (isMetaSdkInitialized) return;

  try {
    // Disable automatic purchase logging; RevenueCat sends subscription revenue events to Meta.
    Settings.setAutoLogAppEventsEnabled(false);
    Settings.initializeSDK();

    const status = await getTrackingStatus();
    await applyAdvertiserTrackingFromStatus(status);

    // Explicit app activation signal.
    AppEventsLogger.logEvent("fb_mobile_activate_app");
  } catch {
    // Meta attribution should never block app startup.
  } finally {
    // Mark initialized even if partially available to keep startup resilient.
    isMetaSdkInitialized = true;
  }
}

export async function setMetaUserId(userId: string): Promise<void> {
  try {
    await initializeMetaSdk();
    AppEventsLogger.setUserID(userId);
  } catch {
    // Meta attribution should never block analytics or app behavior.
  }
}

export async function ensureMetaTrackingConsentBeforePaywall(): Promise<void> {
  if (Platform.OS !== "ios") return;

  try {
    await initializeMetaSdk();

    const hasPrompted = (await AsyncStorage.getItem(META_ATT_PROMPTED_KEY)) === "true";
    let status = await getTrackingStatus();

    if (status === "not-determined" && !hasPrompted) {
      await AsyncStorage.setItem(META_ATT_PROMPTED_KEY, "true");
      status = await requestTrackingPermission();
    }

    await applyAdvertiserTrackingFromStatus(status);
  } catch {
    // Never block paywall rendering because of tracking permission state checks.
  }
}

export async function getMetaAnonymousId(): Promise<string | null> {
  try {
    await initializeMetaSdk();
    const anonymousId = await AppEventsLogger.getAnonymousID();
    const trimmed = anonymousId?.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export async function logMetaFunnelEvent(
  name: "paywall_viewed" | "paywall_checkout_started",
  params?: MetaTrackingParams
): Promise<void> {
  try {
    await initializeMetaSdk();

    const sanitized = sanitizeParams(params);

    if (name === "paywall_viewed") {
      AppEventsLogger.logEvent(AppEventsLogger.AppEvents.ViewedContent, {
        content_type: "paywall",
        ...sanitized,
      });
      return;
    }

    if (name === "paywall_checkout_started") {
      AppEventsLogger.logEvent(AppEventsLogger.AppEvents.InitiatedCheckout, {
        content_type: "subscription",
        ...sanitized,
      });
    }
  } catch {
    // Meta attribution should never block analytics flow.
  }
}
