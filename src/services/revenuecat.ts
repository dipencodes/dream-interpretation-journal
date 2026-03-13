import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  PACKAGE_TYPE,
} from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import type { Store } from "@revenuecat/purchases-typescript-internal";
import {
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_IOS_API_KEY,
  REVENUECAT_OFFERING_ID,
} from "../config/revenuecat";
import { ensureAnonymousAuth } from "./auth";

type RevenueCatOfferingPackages = {
  weekly?: PurchasesPackage;
  monthly?: PurchasesPackage;
  yearly?: PurchasesPackage;
};

export type SubscriptionPlanInterval = "weekly" | "monthly" | "yearly" | "unknown";

export type SubscriptionStatus = {
  isPremiumActive: boolean;
  willRenew: boolean | null;
  expirationDate: string | null;
  unsubscribeDetectedAt: string | null;
  managementURL: string | null;
  store: Store | null;
};

let isConfigured = false;

function isPlaceholderApiKey(value: string) {
  return value.startsWith("YOUR_REVENUECAT_");
}

function getRevenueCatApiKey() {
  return Platform.OS === "ios" ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;
}

function isPremiumActive(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]);
}

export async function configureRevenueCat(): Promise<void> {
  if (isConfigured) return;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey || isPlaceholderApiKey(apiKey)) {
    throw new Error(
      "RevenueCat SDK key is missing. Add iOS/Android public SDK keys in src/config/revenuecat.ts."
    );
  }

  Purchases.configure({ apiKey });
  isConfigured = true;
}

export async function syncRevenueCatUser(uid: string): Promise<void> {
  await configureRevenueCat();
  const currentAppUserId = await Purchases.getAppUserID();
  if (currentAppUserId !== uid) {
    await Purchases.logIn(uid);
  }
}

export async function getIsPremium(): Promise<boolean> {
  await configureRevenueCat();
  const customerInfo = await Purchases.getCustomerInfo();
  return isPremiumActive(customerInfo);
}

export async function getCurrentOfferingPackages(): Promise<RevenueCatOfferingPackages> {
  await configureRevenueCat();
  const offerings = await Purchases.getOfferings();
  const offering =
    offerings.all[REVENUECAT_OFFERING_ID] ?? offerings.current ?? null;

  if (!offering) {
    return {};
  }

  const weekly = offering.availablePackages.find(
    (pkg) => pkg.packageType === PACKAGE_TYPE.WEEKLY
  );
  const monthly = offering.availablePackages.find(
    (pkg) => pkg.packageType === PACKAGE_TYPE.MONTHLY
  );
  const yearly = offering.availablePackages.find(
    (pkg) => pkg.packageType === PACKAGE_TYPE.ANNUAL
  );

  return { weekly, monthly, yearly };
}

export async function purchasePlan(
  packageToBuy: PurchasesPackage
): Promise<{ isPremium: boolean }> {
  await configureRevenueCat();
  const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
  return { isPremium: isPremiumActive(customerInfo) };
}

export async function restorePurchases(): Promise<{ isPremium: boolean }> {
  await configureRevenueCat();
  const customerInfo = await Purchases.restorePurchases();
  return { isPremium: isPremiumActive(customerInfo) };
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const { uid } = await ensureAnonymousAuth();
  await syncRevenueCatUser(uid);

  const customerInfo = await Purchases.getCustomerInfo();
  const entitlement =
    customerInfo.entitlements.all[REVENUECAT_ENTITLEMENT_ID] ?? null;

  if (!entitlement || !entitlement.isActive) {
    return {
      isPremiumActive: false,
      willRenew: null,
      expirationDate: null,
      unsubscribeDetectedAt: null,
      managementURL: customerInfo.managementURL,
      store: entitlement?.store ?? null,
    };
  }

  return {
    isPremiumActive: true,
    willRenew: entitlement.willRenew,
    expirationDate: entitlement.expirationDate,
    unsubscribeDetectedAt: entitlement.unsubscribeDetectedAt,
    managementURL: customerInfo.managementURL,
    store: entitlement.store,
  };
}

export async function openSubscriptionManagement(): Promise<void> {
  const { uid } = await ensureAnonymousAuth();
  await syncRevenueCatUser(uid);
  await RevenueCatUI.presentCustomerCenter();
}

export async function getActiveSubscriptionPlanInterval(): Promise<SubscriptionPlanInterval> {
  const { uid } = await ensureAnonymousAuth();
  await syncRevenueCatUser(uid);

  const customerInfo = await Purchases.getCustomerInfo();
  const entitlement =
    customerInfo.entitlements.all[REVENUECAT_ENTITLEMENT_ID] ?? null;

  if (!entitlement || !entitlement.isActive) {
    return "unknown";
  }

  const productIdentifier = entitlement.productIdentifier;
  const { weekly, monthly, yearly } = await getCurrentOfferingPackages();

  if (weekly?.product.identifier === productIdentifier) {
    return "weekly";
  }
  if (monthly?.product.identifier === productIdentifier) {
    return "monthly";
  }
  if (yearly?.product.identifier === productIdentifier) {
    return "yearly";
  }

  return "unknown";
}
