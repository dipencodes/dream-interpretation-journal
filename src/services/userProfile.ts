import AsyncStorage from "@react-native-async-storage/async-storage";

const NAME_KEY = "profile_name";

export async function getPreferredName(): Promise<string | null> {
  const name = await AsyncStorage.getItem(NAME_KEY);
  if (!name) return null;
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function setPreferredName(name: string): Promise<void> {
  await AsyncStorage.setItem(NAME_KEY, name.trim());
}
