import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InterpretMethodKey } from "./appPreferences";

const STORAGE_KEY = "dreams";

export type MethodInterpretation = {
  interpretation: string;
  warning: string | null;
};

export type DreamRecord = {
  id: string;
  createdAt: number;
  dreamDate: string;
  dreamText: string;
  interpretation: string | null;
  warning: string | null;
  sourceKey: string;
  moodLabel?: string;
  moodIcon?: string;
  interpretations?: Partial<Record<InterpretMethodKey, MethodInterpretation>>;
};

export async function saveDream(record: DreamRecord) {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  const dreams: DreamRecord[] = existing ? JSON.parse(existing) : [];

  dreams.unshift(record); // newest first

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dreams));
}

export async function getDreams(): Promise<DreamRecord[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function upsertDream(record: DreamRecord) {
  const dreams = await getDreams();
  const existingIndex = dreams.findIndex((dream) => dream.id === record.id);

  if (existingIndex >= 0) {
    dreams[existingIndex] = {
      ...dreams[existingIndex],
      ...record,
    };
  } else {
    dreams.unshift(record);
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dreams));
}
