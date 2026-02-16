import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";
const DEFAULT_INTERPRET_METHOD_KEY = "default_interpret_method";
const HOME_DREAM_PROMPT_DISMISSED_DATE_KEY = "home_dream_prompt_dismissed_date";

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

export async function setHasCompletedOnboarding(completed: boolean): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? "true" : "false");
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
