import AsyncStorage from "@react-native-async-storage/async-storage";

const PAYWALL_CONTINUATION_PREFIX = "paywall_continuation_rewarded:";

export function createPaywallContinuationToken(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}_${randomPart}`;
}

function getContinuationStorageKey(token: string): string {
  return `${PAYWALL_CONTINUATION_PREFIX}${token}`;
}

export async function markPaywallContinuationRewarded(token: string): Promise<void> {
  if (!token) return;
  await AsyncStorage.setItem(getContinuationStorageKey(token), "rewarded");
}

export async function consumePaywallContinuationRewarded(token: string): Promise<boolean> {
  if (!token) return false;
  const storageKey = getContinuationStorageKey(token);
  const value = await AsyncStorage.getItem(storageKey);
  if (value !== "rewarded") {
    return false;
  }
  await AsyncStorage.removeItem(storageKey);
  return true;
}
