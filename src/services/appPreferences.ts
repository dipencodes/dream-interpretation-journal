import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";
const ONBOARDING_COMPLETED_AT_MS_KEY = "onboarding_completed_at_ms";
const DEFAULT_INTERPRET_METHOD_KEY = "default_interpret_method";
const HOME_DREAM_PROMPT_DISMISSED_DATE_KEY = "home_dream_prompt_dismissed_date";
const REVIEW_PROMPT_LAST_DECLINED_AT_MS_KEY = "review_prompt_last_declined_at_ms";
const REVIEW_PROMPT_COMPLETED_KEY = "review_prompt_completed";
const REVIEW_PROMPT_LEGACY_ANCHOR_AT_MS_KEY = "review_prompt_legacy_anchor_at_ms";

export type InterpretMethodKey =
  | "hindu"
  | "buddhist"
  | "christian"
  | "islamic"
  | "scientific";

export async function getHasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
  return value === "true";
}

function normalizePositiveMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
}

export async function getOnboardingCompletedAtMs(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(ONBOARDING_COMPLETED_AT_MS_KEY);
  if (!raw) return null;

  const parsed = Number(raw);
  return normalizePositiveMs(parsed);
}

export async function setOnboardingCompletedAtMs(value: number | null): Promise<void> {
  if (value === null) {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_AT_MS_KEY);
    return;
  }

  const normalized = normalizePositiveMs(value);
  if (normalized === null) {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_AT_MS_KEY);
    return;
  }

  await AsyncStorage.setItem(ONBOARDING_COMPLETED_AT_MS_KEY, String(normalized));
}

export async function setHasCompletedOnboarding(
  completed: boolean,
  completedAtMs?: number | null
): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? "true" : "false");

  if (!completed) {
    await setOnboardingCompletedAtMs(null);
    return;
  }

  const existingCompletedAt = await getOnboardingCompletedAtMs();
  if (existingCompletedAt !== null) return;

  const normalizedProvided = normalizePositiveMs(completedAtMs ?? null);
  await setOnboardingCompletedAtMs(normalizedProvided ?? Date.now());
}

export async function getDefaultInterpretMethod(): Promise<InterpretMethodKey | null> {
  const value = await AsyncStorage.getItem(DEFAULT_INTERPRET_METHOD_KEY);
  if (
    value === "hindu" ||
    value === "buddhist" ||
    value === "christian" ||
    value === "islamic" ||
    value === "scientific"
  ) {
    return value;
  }
  return null;
}

export async function setDefaultInterpretMethod(
  method: InterpretMethodKey | null
): Promise<void> {
  if (method) {
    await AsyncStorage.setItem(DEFAULT_INTERPRET_METHOD_KEY, method);
    return;
  }
  await AsyncStorage.removeItem(DEFAULT_INTERPRET_METHOD_KEY);
}

export async function getHomeDreamPromptDismissedDate(): Promise<string | null> {
  const value = await AsyncStorage.getItem(HOME_DREAM_PROMPT_DISMISSED_DATE_KEY);
  return value ?? null;
}

export async function setHomeDreamPromptDismissedDate(dateKey: string | null): Promise<void> {
  if (!dateKey) {
    await AsyncStorage.removeItem(HOME_DREAM_PROMPT_DISMISSED_DATE_KEY);
    return;
  }
  await AsyncStorage.setItem(HOME_DREAM_PROMPT_DISMISSED_DATE_KEY, dateKey);
}

export async function getReviewPromptLastDeclinedAtMs(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(REVIEW_PROMPT_LAST_DECLINED_AT_MS_KEY);
  if (!raw) return null;

  const parsed = Number(raw);
  return normalizePositiveMs(parsed);
}

export async function setReviewPromptLastDeclinedAtMs(value: number | null): Promise<void> {
  if (value === null) {
    await AsyncStorage.removeItem(REVIEW_PROMPT_LAST_DECLINED_AT_MS_KEY);
    return;
  }

  const normalized = normalizePositiveMs(value);
  if (normalized === null) {
    await AsyncStorage.removeItem(REVIEW_PROMPT_LAST_DECLINED_AT_MS_KEY);
    return;
  }

  await AsyncStorage.setItem(REVIEW_PROMPT_LAST_DECLINED_AT_MS_KEY, String(normalized));
}

export async function getReviewPromptCompleted(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(REVIEW_PROMPT_COMPLETED_KEY);
  return raw === "true";
}

export async function setReviewPromptCompleted(value: boolean): Promise<void> {
  await AsyncStorage.setItem(REVIEW_PROMPT_COMPLETED_KEY, value ? "true" : "false");
}

export async function getReviewPromptLegacyAnchorAtMs(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(REVIEW_PROMPT_LEGACY_ANCHOR_AT_MS_KEY);
  if (!raw) return null;

  const parsed = Number(raw);
  return normalizePositiveMs(parsed);
}

export async function setReviewPromptLegacyAnchorAtMs(value: number | null): Promise<void> {
  if (value === null) {
    await AsyncStorage.removeItem(REVIEW_PROMPT_LEGACY_ANCHOR_AT_MS_KEY);
    return;
  }

  const normalized = normalizePositiveMs(value);
  if (normalized === null) {
    await AsyncStorage.removeItem(REVIEW_PROMPT_LEGACY_ANCHOR_AT_MS_KEY);
    return;
  }

  await AsyncStorage.setItem(REVIEW_PROMPT_LEGACY_ANCHOR_AT_MS_KEY, String(normalized));
}
