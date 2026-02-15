import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  PACKAGE_TYPE,
} from "react-native-purchases";
import {
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_IOS_API_KEY,
  REVENUECAT_OFFERING_ID,
} from "../config/revenuecat";

type RevenueCatOfferingPackages = {
  weekly?: PurchasesPackage;
  monthly?: PurchasesPackage;
  yearly?: PurchasesPackage;
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

