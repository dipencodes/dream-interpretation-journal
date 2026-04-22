import { Alert, Linking, Platform } from "react-native";
import type { DreamRecord } from "./dreamStorage";
import { getDreams } from "./dreamStorage";
import { getPlaygroundDreams } from "./playgroundStorage";
import {
  getHasCompletedOnboarding,
  getOnboardingCompletedAtMs,
  getReviewPromptCompleted,
  getReviewPromptLastDeclinedAtMs,
  getReviewPromptLegacyAnchorAtMs,
  setOnboardingCompletedAtMs,
  setReviewPromptCompleted,
  setReviewPromptLastDeclinedAtMs,
  setReviewPromptLegacyAnchorAtMs,
} from "./appPreferences";
import { t } from "../i18n";

const ONBOARDING_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEW_DECLINE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_INTERPRETED_DREAMS_FOR_REVIEW_PROMPT = 4;
const ANDROID_PACKAGE_ID = "com.dreamjournal.interpretation";

type PromptEligibilityResult = {
  eligible: boolean;
  interpretedDreamCount: number;
  onboardingCompletedAtMs: number | null;
};

function getDreamUniqueKey(dream: DreamRecord): string {
  if (dream.id?.trim()) {
    return dream.id;
  }

  const createdAt =
    typeof dream.createdAt === "number" && Number.isFinite(dream.createdAt)
      ? Math.floor(dream.createdAt)
      : 0;
  return `${createdAt}:${dream.dreamDate}:${dream.dreamText.slice(0, 80)}`;
}

function getDreamCreatedAtMs(dream: DreamRecord): number | null {
  if (
    typeof dream.createdAt === "number" &&
    Number.isFinite(dream.createdAt) &&
    dream.createdAt > 0
  ) {
    return Math.floor(dream.createdAt);
  }

  const parsedDateMs = Date.parse(dream.dreamDate);
  if (Number.isFinite(parsedDateMs) && parsedDateMs > 0) {
    return Math.floor(parsedDateMs);
  }

  return null;
}

function hasInterpretation(dream: DreamRecord): boolean {
  if (typeof dream.interpretation === "string" && dream.interpretation.trim().length > 0) {
    return true;
  }

  if (!dream.interpretations) {
    return false;
  }

  return Object.values(dream.interpretations).some((entry) => {
    if (!entry) return false;
    return (
      typeof entry.interpretation === "string" && entry.interpretation.trim().length > 0
    );
  });
}

async function getAllDreams(): Promise<DreamRecord[]> {
  const [journalDreams, playgroundDreams] = await Promise.all([
    getDreams(),
    getPlaygroundDreams(),
  ]);

  return [...journalDreams, ...playgroundDreams];
}

function getUniqueInterpretedDreamCount(allDreams: DreamRecord[]): number {
  const interpretedDreamIds = new Set<string>();

  allDreams.forEach((dream) => {
    if (!hasInterpretation(dream)) return;
    interpretedDreamIds.add(getDreamUniqueKey(dream));
  });

  return interpretedDreamIds.size;
}

function getEarliestDreamTimestampMs(allDreams: DreamRecord[]): number | null {
  let earliest: number | null = null;

  allDreams.forEach((dream) => {
    const createdAtMs = getDreamCreatedAtMs(dream);
    if (createdAtMs === null) return;

    if (earliest === null || createdAtMs < earliest) {
      earliest = createdAtMs;
    }
  });

  return earliest;
}

async function resolveOnboardingCompletedAtMs(
  nowMs: number,
  allDreams: DreamRecord[]
): Promise<number | null> {
  const hasCompletedOnboarding = await getHasCompletedOnboarding();
  if (!hasCompletedOnboarding) return null;

  const existingOnboardingCompletedAtMs = await getOnboardingCompletedAtMs();
  if (existingOnboardingCompletedAtMs !== null) {
    return existingOnboardingCompletedAtMs;
  }

  const earliestDreamTimestampMs = getEarliestDreamTimestampMs(allDreams);
  if (earliestDreamTimestampMs !== null) {
    await setOnboardingCompletedAtMs(earliestDreamTimestampMs);
    return earliestDreamTimestampMs;
  }

  const existingLegacyAnchor = await getReviewPromptLegacyAnchorAtMs();
  if (existingLegacyAnchor !== null) {
    return existingLegacyAnchor;
  }

  await setReviewPromptLegacyAnchorAtMs(nowMs);
  return nowMs;
}

export async function getReviewPromptEligibility(
  nowMs: number = Date.now()
): Promise<PromptEligibilityResult> {
  const allDreams = await getAllDreams();
  const interpretedDreamCount = getUniqueInterpretedDreamCount(allDreams);
  if (interpretedDreamCount < MIN_INTERPRETED_DREAMS_FOR_REVIEW_PROMPT) {
    return {
      eligible: false,
      interpretedDreamCount,
      onboardingCompletedAtMs: null,
    };
  }

  const onboardingCompletedAtMs = await resolveOnboardingCompletedAtMs(nowMs, allDreams);
  if (onboardingCompletedAtMs === null) {
    return {
      eligible: false,
      interpretedDreamCount,
      onboardingCompletedAtMs: null,
    };
  }

  if (nowMs - onboardingCompletedAtMs < ONBOARDING_MIN_AGE_MS) {
    return {
      eligible: false,
      interpretedDreamCount,
      onboardingCompletedAtMs,
    };
  }

  const reviewPromptCompleted = await getReviewPromptCompleted();
  if (reviewPromptCompleted) {
    return {
      eligible: false,
      interpretedDreamCount,
      onboardingCompletedAtMs,
    };
  }

  const lastDeclinedAtMs = await getReviewPromptLastDeclinedAtMs();
  if (lastDeclinedAtMs !== null && nowMs - lastDeclinedAtMs < REVIEW_DECLINE_COOLDOWN_MS) {
    return {
      eligible: false,
      interpretedDreamCount,
      onboardingCompletedAtMs,
    };
  }

  return {
    eligible: true,
    interpretedDreamCount,
    onboardingCompletedAtMs,
  };
}

function askResonanceQuestion(): Promise<"yes" | "no"> {
  return new Promise((resolve) => {
    Alert.alert(t.reviewPrompt.resonanceTitle, t.reviewPrompt.resonanceMessage, [
      {
        text: t.reviewPrompt.noCta,
        onPress: () => resolve("no"),
      },
      {
        text: t.reviewPrompt.yesCta,
        onPress: () => resolve("yes"),
      },
    ]);
  });
}

function askForReviewPrompt(): Promise<"leave_review" | "not_now"> {
  return new Promise((resolve) => {
    Alert.alert(t.reviewPrompt.reviewTitle, t.reviewPrompt.reviewMessage, [
      {
        text: t.reviewPrompt.notNowCta,
        style: "cancel",
        onPress: () => resolve("not_now"),
      },
      {
        text: t.reviewPrompt.leaveReviewCta,
        onPress: () => resolve("leave_review"),
      },
    ]);
  });
}

function showNoFeedbackMessage() {
  Alert.alert(t.reviewPrompt.feedbackTitle, t.reviewPrompt.feedbackMessage);
}

async function requestNativeInAppReview(): Promise<boolean> {
  try {
    const inAppReviewModule = require("react-native-in-app-review");
    const inAppReview = inAppReviewModule?.default ?? inAppReviewModule;

    if (
      typeof inAppReview?.isAvailable !== "function" ||
      typeof inAppReview?.RequestInAppReview !== "function"
    ) {
      return false;
    }

    const isAvailable = await inAppReview.isAvailable();
    if (!isAvailable) return false;

    await inAppReview.RequestInAppReview();
    return true;
  } catch {
    return false;
  }
}

async function openAndroidReviewPage(): Promise<void> {
  if (Platform.OS !== "android") return;

  const marketUrl = `market://details?id=${ANDROID_PACKAGE_ID}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

  try {
    const canOpenMarketUrl = await Linking.canOpenURL(marketUrl);
    if (canOpenMarketUrl) {
      await Linking.openURL(marketUrl);
      return;
    }
  } catch {
    // Continue with web fallback.
  }

  try {
    await Linking.openURL(webUrl);
  } catch {
    // Keep prompt flow resilient.
  }
}

async function requestReviewWithFallback(): Promise<void> {
  const didRequestNative = await requestNativeInAppReview();
  if (didRequestNative) return;

  if (Platform.OS === "android") {
    await openAndroidReviewPage();
  }
}

let isReviewPromptInProgress = false;

export async function maybePromptReviewAfterInterpretation(): Promise<boolean> {
  if (isReviewPromptInProgress) return false;
  isReviewPromptInProgress = true;

  try {
    const nowMs = Date.now();
    const { eligible } = await getReviewPromptEligibility(nowMs);
    if (!eligible) return false;

    const resonance = await askResonanceQuestion();
    if (resonance === "no") {
      await setReviewPromptLastDeclinedAtMs(nowMs);
      showNoFeedbackMessage();
      return true;
    }

    await setReviewPromptCompleted(true);

    const reviewDecision = await askForReviewPrompt();
    if (reviewDecision === "leave_review") {
      await requestReviewWithFallback();
    }

    return true;
  } finally {
    isReviewPromptInProgress = false;
  }
}
