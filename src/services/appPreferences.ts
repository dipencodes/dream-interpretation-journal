import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";
const DEFAULT_INTERPRET_METHOD_KEY = "default_interpret_method";

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
