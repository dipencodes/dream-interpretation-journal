import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InterpretMethodKey } from "./appPreferences";
import { setHasCompletedOnboarding } from "./appPreferences";
import {
  trackDreamSaved,
  trackOnboardingCompletedFirstDreamSaved,
} from "./tracking";

const STORAGE_KEY = "dreams";

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDreamDateToLocalDate(dreamDate: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dreamDate)) {
    const [year, month, day] = dreamDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = Date.parse(dreamDate);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed);
}

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

export function getDreamLoggedDateKey(dream: DreamRecord): string | null {
  const createdAt = Number(dream.createdAt);
  if (Number.isFinite(createdAt) && createdAt > 0) {
    return toLocalDateKey(new Date(createdAt));
  }

  const parsedDreamDate = parseDreamDateToLocalDate(dream.dreamDate);
  return parsedDreamDate ? toLocalDateKey(parsedDreamDate) : null;
}

export async function saveDream(record: DreamRecord) {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  const dreams: DreamRecord[] = existing ? JSON.parse(existing) : [];
  const isFirstDream = dreams.length === 0;

  dreams.unshift(record); // newest first

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dreams));
  await setHasCompletedOnboarding(true, record.createdAt);
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

export async function hasDreamLoggedToday(): Promise<boolean> {
  const dreams = await getDreams();
  const todayKey = toLocalDateKey(new Date());
  return dreams.some((dream) => getDreamLoggedDateKey(dream) === todayKey);
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

export async function deleteDream(id: string): Promise<void> {
  const dreams = await getDreams();
  const next = dreams.filter((dream) => dream.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
