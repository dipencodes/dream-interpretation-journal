// src/services/userGate.ts
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore/lib/modular";

export type UserGate = {
  uid: string;
  onboardingFreeUsed: boolean;
  onboardingFallbackUsed: boolean;
  weeklyUsesCount: number;
  weeklyWindowStartedAt: number | null;
  rewardedCredits: number;
  rewardedDailyCount: number;
  rewardedWindowStartedAt: number | null;
};

type UserGateDoc = {
  freeUsed?: boolean;
  onboardingFreeUsed?: boolean;
  onboardingFallbackUsed?: boolean;
  weeklyUsesCount?: number;
  weeklyWindowStartedAt?: number;
  rewardedCredits?: number;
  rewardedDailyCount?: number;
  rewardedWindowStartedAt?: number;
};

function normalizeWeeklyUsesCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function normalizeWeeklyWindowStartedAt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function normalizeRewardedCredits(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function normalizeUserGate(uid: string, data?: UserGateDoc): UserGate {
  return {
    uid,
    // Legacy migration: previous `freeUsed=true` means the onboarding free use was already consumed.
    onboardingFreeUsed:
      typeof data?.onboardingFreeUsed === "boolean"
        ? data.onboardingFreeUsed
        : Boolean(data?.freeUsed),
    onboardingFallbackUsed: Boolean(data?.onboardingFallbackUsed),
    weeklyUsesCount: normalizeWeeklyUsesCount(data?.weeklyUsesCount),
    weeklyWindowStartedAt: normalizeWeeklyWindowStartedAt(data?.weeklyWindowStartedAt),
    rewardedCredits: normalizeRewardedCredits(data?.rewardedCredits),
    rewardedDailyCount: normalizeWeeklyUsesCount(data?.rewardedDailyCount),
    rewardedWindowStartedAt: normalizeWeeklyWindowStartedAt(data?.rewardedWindowStartedAt),
  };
}

export async function getOrCreateUserGate(uid: string): Promise<UserGate> {
  const db = getFirestore(getApp());
  const userRef = doc(collection(db, "users"), uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const defaultGate: UserGate = {
      uid,
      onboardingFreeUsed: false,
      onboardingFallbackUsed: false,
      weeklyUsesCount: 0,
      weeklyWindowStartedAt: null,
      rewardedCredits: 0,
      rewardedDailyCount: 0,
      rewardedWindowStartedAt: null,
    };

    await setDoc(
      userRef,
      {
        onboardingFreeUsed: defaultGate.onboardingFreeUsed,
        onboardingFallbackUsed: defaultGate.onboardingFallbackUsed,
        weeklyUsesCount: defaultGate.weeklyUsesCount,
        weeklyWindowStartedAt: defaultGate.weeklyWindowStartedAt,
        rewardedCredits: defaultGate.rewardedCredits,
        rewardedDailyCount: defaultGate.rewardedDailyCount,
        rewardedWindowStartedAt: defaultGate.rewardedWindowStartedAt,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return defaultGate;
  }

  const data = snap.data() as UserGateDoc | undefined;
  return normalizeUserGate(uid, data);
}

export async function setUserGateState(
  uid: string,
  state: Partial<
    Pick<
      UserGate,
      | "onboardingFreeUsed"
      | "onboardingFallbackUsed"
      | "weeklyUsesCount"
      | "weeklyWindowStartedAt"
      | "rewardedCredits"
      | "rewardedDailyCount"
      | "rewardedWindowStartedAt"
    >
  >
): Promise<void> {
  const db = getFirestore(getApp());
  const userRef = doc(collection(db, "users"), uid);
  await setDoc(
    userRef,
    {
      ...state,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
