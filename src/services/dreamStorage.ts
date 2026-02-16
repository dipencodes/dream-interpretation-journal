import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InterpretMethodKey } from "./appPreferences";
import { setHasCompletedOnboarding } from "./appPreferences";
import {
  trackDreamSaved,
  trackOnboardingCompletedFirstDreamSaved,
} from "./tracking";

const STORAGE_KEY = "dreams";

export type MethodInterpretation = {
  summary?: string | null;
  interpretation: string;
  warning: string | null;
};

export type DreamRecord = {
  id: string;
  createdAt: number;
  dreamDate: string;
  dreamText: string;
  interpretationSummary?: string | null;
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
  const isFirstDream = dreams.length === 0;

  dreams.unshift(record); // newest first

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dreams));
  await setHasCompletedOnboarding(true);
  await trackDreamSaved({
    has_interpretation: Boolean(record.interpretation),
    source_key: record.sourceKey || "unknown",
    has_mood: Boolean(record.moodIcon || record.moodLabel),
  });

  if (isFirstDream) {
    await trackOnboardingCompletedFirstDreamSaved();
  }
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
