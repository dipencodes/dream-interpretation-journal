import { ensureAnonymousAuth } from "./auth";
import { getIsPremium, syncRevenueCatUser } from "./revenuecat";
import { getOrCreateUserGate, setFreeUsed } from "./userGate";

type GateAllowedReason = "premium" | "free";
type GateBlockedReason = "blocked";

export type GateCheckResult =
  | { allowed: true; reason: GateAllowedReason; uid: string }
  | { allowed: false; reason: GateBlockedReason; uid: string };

async function isPremiumForUid(uid: string): Promise<boolean> {
  await syncRevenueCatUser(uid);
  return getIsPremium();
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
  if (!gate.freeUsed) {
    return { allowed: true, reason: "free", uid };
  }

  return { allowed: false, reason: "blocked", uid };
}

export async function consumeFreeUseIfNeeded(uid: string): Promise<void> {
  try {
    const isPremium = await isPremiumForUid(uid);
    if (isPremium) {
      return;
    }
  } catch {
    // Fall through to free gate update.
  }

  const gate = await getOrCreateUserGate(uid);
  if (!gate.freeUsed) {
    await setFreeUsed(uid, true);
  }
}

