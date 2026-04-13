import type { DreamRecord } from "../services/dreamStorage";
import type { InterpretMethodKey } from "../services/appPreferences";

export type DreamFlowContext = "journal" | "playground";
export type DreamPostCreateBackTarget = "home" | "journal" | "playground";

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
        entry?: "gate" | "direct" | "reward";
        continuationToken?: string;
      }
    | undefined;
  DreamInput:
    | {
        context?: DreamFlowContext;
        postCreateBackTarget?: DreamPostCreateBackTarget;
      }
    | undefined;
  DreamMood: {
    dreamText: string;
    dreamDate: string;
    context?: DreamFlowContext;
    postCreateBackTarget?: DreamPostCreateBackTarget;
  };
  DreamInterpretMethod: {
    dreamText: string;
    dreamDate: string;
    moodLabel: string;
    moodIcon: string;
    selectedMoodId: string;
    presetMethod?: InterpretMethodKey;
    context?: DreamFlowContext;
    postCreateBackTarget?: DreamPostCreateBackTarget;
  };
  DreamSummary: {
    dream: DreamRecord;
    context?: DreamFlowContext;
  };
};
