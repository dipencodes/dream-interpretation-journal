// src/services/auth.ts
import auth from "@react-native-firebase/auth";
import { ensureFirebaseInitialized } from "./firebase";

export async function ensureAnonymousAuth(): Promise<{ uid: string }> {
  ensureFirebaseInitialized();

  const current = auth().currentUser;
  if (current) {
    return { uid: current.uid };
  }

  const cred = await auth().signInAnonymously();
  if (!cred.user?.uid) {
    throw new Error("Anonymous sign-in succeeded but no user uid was returned.");
  }

  return { uid: cred.user.uid };
}
