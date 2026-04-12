import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

export const ADMOB_ANDROID_APP_ID = "ca-app-pub-3070466523357671~2297930275";
export const ADMOB_IOS_APP_ID = "ca-app-pub-3070466523357671~9469631256";

export const ADMOB_ANDROID_REWARDED_AD_UNIT_ID = "ca-app-pub-3070466523357671/2333589297";
export const ADMOB_IOS_REWARDED_AD_UNIT_ID = "ca-app-pub-3070466523357671/9693204562";

export function getRewardedAdUnitId(): string {
  if (__DEV__) return TestIds.REWARDED;
  return Platform.OS === "ios"
    ? ADMOB_IOS_REWARDED_AD_UNIT_ID
    : ADMOB_ANDROID_REWARDED_AD_UNIT_ID;
}
