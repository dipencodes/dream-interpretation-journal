import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DreamRecord } from "./dreamStorage";

const PLAYGROUND_STORAGE_KEY = "playground_dreams";

export async function savePlaygroundDream(record: DreamRecord): Promise<void> {
  const existing = await AsyncStorage.getItem(PLAYGROUND_STORAGE_KEY);
  const dreams: DreamRecord[] = existing ? JSON.parse(existing) : [];

  dreams.unshift(record);
  await AsyncStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(dreams));
}

export async function getPlaygroundDreams(): Promise<DreamRecord[]> {
  const data = await AsyncStorage.getItem(PLAYGROUND_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function upsertPlaygroundDream(record: DreamRecord): Promise<void> {
  const dreams = await getPlaygroundDreams();
  const existingIndex = dreams.findIndex((dream) => dream.id === record.id);

  if (existingIndex >= 0) {
    dreams[existingIndex] = {
      ...dreams[existingIndex],
      ...record,
    };
  } else {
    dreams.unshift(record);
  }

  await AsyncStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(dreams));
}

export async function deletePlaygroundDream(id: string): Promise<void> {
  const dreams = await getPlaygroundDreams();
  const next = dreams.filter((dream) => dream.id !== id);
  await AsyncStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(next));
}
