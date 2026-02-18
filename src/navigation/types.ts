import type { DreamRecord } from "../services/dreamStorage";
import type { InterpretMethodKey } from "../services/appPreferences";

export type DreamFlowContext = "journal" | "playground";

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Journal: undefined;
  Playground: undefined;
  Settings: undefined;
  InterpretationMethodSettings: undefined;
  NotificationSettings: undefined;
  Paywall:
    | {
        entry?: "gate" | "direct";
      }
    | undefined;
  DreamInput:
    | {
        context?: DreamFlowContext;
      }
    | undefined;
  DreamMood: {
    dreamText: string;
    dreamDate: string;
    context?: DreamFlowContext;
  };
  DreamInterpretMethod: {
    dreamText: string;
    dreamDate: string;
    moodLabel: string;
    moodIcon: string;
    selectedMoodId: string;
    presetMethod?: InterpretMethodKey;
    context?: DreamFlowContext;
  };
  DreamSummary: {
    dream: DreamRecord;
    context?: DreamFlowContext;
  };
};
