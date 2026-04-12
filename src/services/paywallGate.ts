import { ensureAnonymousAuth } from "./auth";
import { getIsPremium, syncRevenueCatUser } from "./revenuecat";
import { getOrCreateUserGate, setUserGateState, type UserGate } from "./userGate";

type GateAllowedReason = "premium" | "free";
type GateBlockedReason = "blocked";
type FreeAccessType = "onboarding" | "weekly";

const WEEKLY_FREE_LIMIT = 1;
const WEEKLY_FREE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type GateCheckResult =
  | { allowed: true; reason: "premium"; uid: string }
  | { allowed: true; reason: "free"; freeAccessType: FreeAccessType; uid: string }
  | { allowed: false; reason: GateBlockedReason; uid: string };

export type FreeUseConsumptionResult =
  | { kind: "premium" }
  | { kind: "onboarding_free" }
  | { kind: "weekly_free" }
  | { kind: "none" };

async function isPremiumForUid(uid: string): Promise<boolean> {
  await syncRevenueCatUser(uid);
  return getIsPremium();
}

type EffectiveGateState = {
  onboardingFreeUsed: boolean;
  weeklyUsesCount: number;
  weeklyWindowStartedAt: number;
  changed: boolean;
};

function getEffectiveGateState(gate: UserGate, nowMs: number): EffectiveGateState {
  const hasValidWindowStart =
    typeof gate.weeklyWindowStartedAt === "number" &&
    Number.isFinite(gate.weeklyWindowStartedAt) &&
    gate.weeklyWindowStartedAt > 0;

  let weeklyWindowStartedAt: number = hasValidWindowStart
    ? (gate.weeklyWindowStartedAt as number)
    : nowMs;
  let weeklyUsesCount = gate.weeklyUsesCount;
  let changed = !hasValidWindowStart;

  const elapsedMs = nowMs - weeklyWindowStartedAt;
  const shouldResetWindow = elapsedMs >= WEEKLY_FREE_WINDOW_MS || elapsedMs < 0;
  if (shouldResetWindow) {
    weeklyWindowStartedAt = nowMs;
    weeklyUsesCount = 0;
    changed = true;
  }

  return {
    onboardingFreeUsed: gate.onboardingFreeUsed,
    weeklyUsesCount,
    weeklyWindowStartedAt,
    changed,
  };
}

export async function canRunAiInterpretation(): Promise<GateCheckResult> {
  const { uid } = await ensureAnonymousAuth();

  try {
    const isPremium = await isPremiumForUid(uid);
    if (isPremium) {
      return { allowed: true, reason: "premium", uid };
    }
  } catch {
    // Continue with free gating if RevenueCat is not configured or temporarily unavailable.
  }

  const gate = await getOrCreateUserGate(uid);
  const effectiveGate = getEffectiveGateState(gate, Date.now());

  if (effectiveGate.changed) {
    await setUserGateState(uid, {
      onboardingFreeUsed: effectiveGate.onboardingFreeUsed,
      weeklyUsesCount: effectiveGate.weeklyUsesCount,
      weeklyWindowStartedAt: effectiveGate.weeklyWindowStartedAt,
    });
  }

  if (!effectiveGate.onboardingFreeUsed) {
    return { allowed: true, reason: "free", freeAccessType: "onboarding", uid };
  }

  if (effectiveGate.weeklyUsesCount < WEEKLY_FREE_LIMIT) {
    return { allowed: true, reason: "free", freeAccessType: "weekly", uid };
  }

  return { allowed: false, reason: "blocked", uid };
}

export async function consumeFreeUseIfNeeded(uid: string): Promise<FreeUseConsumptionResult> {
  try {
    const isPremium = await isPremiumForUid(uid);
    if (isPremium) {
      return { kind: "premium" };
    }
  } catch {
    // Fall through to free gate update.
  }

  const gate = await getOrCreateUserGate(uid);
  const effectiveGate = getEffectiveGateState(gate, Date.now());

  if (!effectiveGate.onboardingFreeUsed) {
    await setUserGateState(uid, {
      onboardingFreeUsed: true,
      weeklyUsesCount: effectiveGate.weeklyUsesCount,
      weeklyWindowStartedAt: effectiveGate.weeklyWindowStartedAt,
    });
    return { kind: "onboarding_free" };
  }

  if (effectiveGate.weeklyUsesCount < WEEKLY_FREE_LIMIT) {
    await setUserGateState(uid, {
      weeklyUsesCount: effectiveGate.weeklyUsesCount + 1,
      weeklyWindowStartedAt: effectiveGate.weeklyWindowStartedAt,
    });
    return { kind: "weekly_free" };
  }

  return { kind: "none" };
}
