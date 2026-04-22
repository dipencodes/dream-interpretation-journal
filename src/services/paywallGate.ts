import { ensureAnonymousAuth } from "./auth";
import { getIsPremium, syncRevenueCatUser } from "./revenuecat";
import { getOrCreateUserGate, setUserGateState, type UserGate } from "./userGate";

type GateBlockedReason = "blocked";
type FreeAccessType = "onboarding" | "weekly";

const WEEKLY_FREE_LIMIT = 1;
const WEEKLY_FREE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const REWARDED_DAILY_LIMIT = 3;
const REWARDED_WINDOW_MS = 24 * 60 * 60 * 1000;

export type GateCheckResult =
  | { allowed: true; reason: "premium"; uid: string }
  | { allowed: true; reason: "free"; freeAccessType: FreeAccessType; uid: string }
  | { allowed: true; reason: "rewarded"; uid: string }
  | { allowed: false; reason: GateBlockedReason; uid: string };

export type GateAllowedResult = Extract<GateCheckResult, { allowed: true }>;

export type GateUseConsumptionResult =
  | { kind: "premium" }
  | { kind: "onboarding_free" }
  | { kind: "weekly_free" }
  | { kind: "rewarded_credit" }
  | { kind: "none" };

export type RewardedAvailabilityResult =
  | { canWatchAd: true; remainingDaily: number; resetsAt: number }
  | { canWatchAd: false; remainingDaily: 0; resetsAt: number };

export type GrantRewardedCreditResult =
  | { granted: true; rewardedCredits: number; remainingDaily: number }
  | { granted: false; reason: "daily_cap_reached"; remainingDaily: number; resetsAt: number }
  | { granted: false; reason: "premium" };

export type FreeCreditStatus = {
  isPremium: boolean;
  totalFreeCreditsAvailable: number;
  remainingDailyRewarded: number;
  rewardedResetsAt: number;
};

async function isPremiumForUid(uid: string): Promise<boolean> {
  await syncRevenueCatUser(uid);
  return getIsPremium();
}

type EffectiveGateState = {
  onboardingFreeUsed: boolean;
  weeklyUsesCount: number;
  weeklyWindowStartedAt: number;
  rewardedCredits: number;
  rewardedDailyCount: number;
  rewardedWindowStartedAt: number;
  changed: boolean;
};

function getEffectiveGateState(gate: UserGate, nowMs: number): EffectiveGateState {
  const hasValidWeeklyWindowStart =
    typeof gate.weeklyWindowStartedAt === "number" &&
    Number.isFinite(gate.weeklyWindowStartedAt) &&
    gate.weeklyWindowStartedAt > 0;
  const hasValidRewardedWindowStart =
    typeof gate.rewardedWindowStartedAt === "number" &&
    Number.isFinite(gate.rewardedWindowStartedAt) &&
    gate.rewardedWindowStartedAt > 0;

  let weeklyWindowStartedAt: number = hasValidWeeklyWindowStart
    ? (gate.weeklyWindowStartedAt as number)
    : nowMs;
  let rewardedWindowStartedAt: number = hasValidRewardedWindowStart
    ? (gate.rewardedWindowStartedAt as number)
    : nowMs;
  let weeklyUsesCount = gate.weeklyUsesCount;
  let rewardedDailyCount = gate.rewardedDailyCount;
  let rewardedCredits = gate.rewardedCredits;
  let changed = !hasValidWeeklyWindowStart || !hasValidRewardedWindowStart;

  const weeklyElapsedMs = nowMs - weeklyWindowStartedAt;
  const shouldResetWeeklyWindow = weeklyElapsedMs >= WEEKLY_FREE_WINDOW_MS || weeklyElapsedMs < 0;
  if (shouldResetWeeklyWindow) {
    weeklyWindowStartedAt = nowMs;
    weeklyUsesCount = 0;
    changed = true;
  }

  const rewardedElapsedMs = nowMs - rewardedWindowStartedAt;
  const shouldResetRewardedWindow = rewardedElapsedMs >= REWARDED_WINDOW_MS || rewardedElapsedMs < 0;
  if (shouldResetRewardedWindow) {
    rewardedWindowStartedAt = nowMs;
    rewardedDailyCount = 0;
    changed = true;
  }

  if (!Number.isFinite(rewardedCredits) || rewardedCredits < 0) {
    rewardedCredits = 0;
    changed = true;
  }

  rewardedCredits = Math.floor(rewardedCredits);

  return {
    onboardingFreeUsed: gate.onboardingFreeUsed,
    weeklyUsesCount,
    weeklyWindowStartedAt,
    rewardedCredits,
    rewardedDailyCount,
    rewardedWindowStartedAt,
    changed,
  };
}

async function persistEffectiveGateStateIfNeeded(
  uid: string,
  effectiveGate: EffectiveGateState
): Promise<void> {
  if (!effectiveGate.changed) return;

  await setUserGateState(uid, {
    onboardingFreeUsed: effectiveGate.onboardingFreeUsed,
    weeklyUsesCount: effectiveGate.weeklyUsesCount,
    weeklyWindowStartedAt: effectiveGate.weeklyWindowStartedAt,
    rewardedCredits: effectiveGate.rewardedCredits,
    rewardedDailyCount: effectiveGate.rewardedDailyCount,
    rewardedWindowStartedAt: effectiveGate.rewardedWindowStartedAt,
  });
}

export async function canRunAiInterpretation(): Promise<GateCheckResult> {
  const { uid } = await ensureAnonymousAuth();

  try {
    const isPremium = await isPremiumForUid(uid);
    if (isPremium) {
      return { allowed: true, reason: "premium", uid };
    }
  } catch {
    // Continue with local gate checks if RevenueCat is unavailable.
  }

  const gate = await getOrCreateUserGate(uid);
  const effectiveGate = getEffectiveGateState(gate, Date.now());
  await persistEffectiveGateStateIfNeeded(uid, effectiveGate);

  if (!effectiveGate.onboardingFreeUsed) {
    return { allowed: true, reason: "free", freeAccessType: "onboarding", uid };
  }

  if (effectiveGate.weeklyUsesCount < WEEKLY_FREE_LIMIT) {
    return { allowed: true, reason: "free", freeAccessType: "weekly", uid };
  }

  if (effectiveGate.rewardedCredits > 0) {
    return { allowed: true, reason: "rewarded", uid };
  }

  return { allowed: false, reason: "blocked", uid };
}

export async function consumeGateUse(gate: GateAllowedResult): Promise<GateUseConsumptionResult> {
  const { uid } = gate;

  try {
    const isPremium = await isPremiumForUid(uid);
    if (isPremium) {
      return { kind: "premium" };
    }
  } catch {
    // Fall through to local gate update.
  }

  const currentGate = await getOrCreateUserGate(uid);
  const effectiveGate = getEffectiveGateState(currentGate, Date.now());
  await persistEffectiveGateStateIfNeeded(uid, effectiveGate);

  if (gate.reason === "free" && gate.freeAccessType === "onboarding") {
    if (!effectiveGate.onboardingFreeUsed) {
      await setUserGateState(uid, {
        onboardingFreeUsed: true,
        weeklyUsesCount: effectiveGate.weeklyUsesCount,
        weeklyWindowStartedAt: effectiveGate.weeklyWindowStartedAt,
      });
      return { kind: "onboarding_free" };
    }
    return { kind: "none" };
  }

  if (gate.reason === "free" && gate.freeAccessType === "weekly") {
    if (effectiveGate.weeklyUsesCount < WEEKLY_FREE_LIMIT) {
      await setUserGateState(uid, {
        weeklyUsesCount: effectiveGate.weeklyUsesCount + 1,
        weeklyWindowStartedAt: effectiveGate.weeklyWindowStartedAt,
      });
      return { kind: "weekly_free" };
    }
    return { kind: "none" };
  }

  if (gate.reason === "rewarded") {
    if (effectiveGate.rewardedCredits > 0) {
      await setUserGateState(uid, {
        rewardedCredits: effectiveGate.rewardedCredits - 1,
        rewardedDailyCount: effectiveGate.rewardedDailyCount,
        rewardedWindowStartedAt: effectiveGate.rewardedWindowStartedAt,
      });
      return { kind: "rewarded_credit" };
    }
    return { kind: "none" };
  }

  return { kind: "premium" };
}

export async function getRewardedAdAvailability(uid: string): Promise<RewardedAvailabilityResult> {
  const gate = await getOrCreateUserGate(uid);
  const effectiveGate = getEffectiveGateState(gate, Date.now());
  await persistEffectiveGateStateIfNeeded(uid, effectiveGate);

  const remainingDaily = Math.max(0, REWARDED_DAILY_LIMIT - effectiveGate.rewardedDailyCount);
  const resetsAt = effectiveGate.rewardedWindowStartedAt + REWARDED_WINDOW_MS;

  if (remainingDaily <= 0) {
    return { canWatchAd: false, remainingDaily: 0, resetsAt };
  }

  return { canWatchAd: true, remainingDaily, resetsAt };
}

export async function getFreeCreditStatus(uid: string): Promise<FreeCreditStatus> {
  let isPremium = false;

  try {
    isPremium = await isPremiumForUid(uid);
  } catch {
    // Continue with local gate state if RevenueCat is unavailable.
  }

  const gate = await getOrCreateUserGate(uid);
  const effectiveGate = getEffectiveGateState(gate, Date.now());
  await persistEffectiveGateStateIfNeeded(uid, effectiveGate);

  const onboardingAvailable = effectiveGate.onboardingFreeUsed ? 0 : 1;
  const weeklyAvailable = effectiveGate.weeklyUsesCount < WEEKLY_FREE_LIMIT ? 1 : 0;
  const totalFreeCreditsAvailable =
    onboardingAvailable + weeklyAvailable + effectiveGate.rewardedCredits;
  const remainingDailyRewarded = Math.max(
    0,
    REWARDED_DAILY_LIMIT - effectiveGate.rewardedDailyCount
  );
  const rewardedResetsAt = effectiveGate.rewardedWindowStartedAt + REWARDED_WINDOW_MS;

  return {
    isPremium,
    totalFreeCreditsAvailable,
    remainingDailyRewarded,
    rewardedResetsAt,
  };
}

export async function grantRewardedCredit(uid: string): Promise<GrantRewardedCreditResult> {
  try {
    const isPremium = await isPremiumForUid(uid);
    if (isPremium) {
      return { granted: false, reason: "premium" };
    }
  } catch {
    // Continue with local gate update.
  }

  const gate = await getOrCreateUserGate(uid);
  const effectiveGate = getEffectiveGateState(gate, Date.now());
  await persistEffectiveGateStateIfNeeded(uid, effectiveGate);

  if (effectiveGate.rewardedDailyCount >= REWARDED_DAILY_LIMIT) {
    return {
      granted: false,
      reason: "daily_cap_reached",
      remainingDaily: 0,
      resetsAt: effectiveGate.rewardedWindowStartedAt + REWARDED_WINDOW_MS,
    };
  }

  const nextRewardedCredits = effectiveGate.rewardedCredits + 1;
  const nextDailyCount = effectiveGate.rewardedDailyCount + 1;
  const remainingDaily = Math.max(0, REWARDED_DAILY_LIMIT - nextDailyCount);

  await setUserGateState(uid, {
    rewardedCredits: nextRewardedCredits,
    rewardedDailyCount: nextDailyCount,
    rewardedWindowStartedAt: effectiveGate.rewardedWindowStartedAt,
  });

  return {
    granted: true,
    rewardedCredits: nextRewardedCredits,
    remainingDaily,
  };
}
