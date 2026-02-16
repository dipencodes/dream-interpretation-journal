import type { DreamRecord } from "../services/dreamStorage";
import type { InterpretMethodKey } from "../services/appPreferences";

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Journal: undefined;
  Settings: undefined;
  InterpretationMethodSettings: undefined;
  NotificationSettings: undefined;
  Paywall:
    | {
        entry?: "gate" | "direct";
      }
    | undefined;
  DreamInput: undefined;
  DreamMood: {
    dreamText: string;
    dreamDate: string;
  };
  DreamInterpretMethod: {
    dreamText: string;
    dreamDate: string;
    moodLabel: string;
    moodIcon: string;
    selectedMoodId: string;
    presetMethod?: InterpretMethodKey;
  };
  DreamSummary: {
    dream: DreamRecord;
  };
};
