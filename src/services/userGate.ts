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
  weeklyUsesCount: number;
  weeklyWindowStartedAt: number | null;
};

type UserGateDoc = {
  freeUsed?: boolean;
  onboardingFreeUsed?: boolean;
  weeklyUsesCount?: number;
  weeklyWindowStartedAt?: number;
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

function normalizeUserGate(uid: string, data?: UserGateDoc): UserGate {
  return {
    uid,
    // Legacy migration: previous `freeUsed=true` means the onboarding free use was already consumed.
    onboardingFreeUsed:
      typeof data?.onboardingFreeUsed === "boolean"
        ? data.onboardingFreeUsed
        : Boolean(data?.freeUsed),
    weeklyUsesCount: normalizeWeeklyUsesCount(data?.weeklyUsesCount),
    weeklyWindowStartedAt: normalizeWeeklyWindowStartedAt(data?.weeklyWindowStartedAt),
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
      weeklyUsesCount: 0,
      weeklyWindowStartedAt: null,
    };

    await setDoc(
      userRef,
      {
        onboardingFreeUsed: defaultGate.onboardingFreeUsed,
        weeklyUsesCount: defaultGate.weeklyUsesCount,
        weeklyWindowStartedAt: defaultGate.weeklyWindowStartedAt,
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
  state: Partial<Pick<UserGate, "onboardingFreeUsed" | "weeklyUsesCount" | "weeklyWindowStartedAt">>
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
