// src/services/auth.ts
import { getApp } from "@react-native-firebase/app";
import { getAuth, signInAnonymously } from "@react-native-firebase/auth";
import { ensureFirebaseInitialized } from "./firebase";

export async function ensureAnonymousAuth(): Promise<{ uid: string }> {
  ensureFirebaseInitialized();
  const auth = getAuth(getApp());

  const current = auth.currentUser;
  if (current) {
    return { uid: current.uid };
  }

  const cred = await signInAnonymously(auth);
  if (!cred.user?.uid) {
    throw new Error("Anonymous sign-in succeeded but no user uid was returned.");
  }

  return { uid: cred.user.uid };
}
