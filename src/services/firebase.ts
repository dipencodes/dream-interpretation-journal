// src/services/firebase.ts
import { getApp, getApps } from "@react-native-firebase/app";

export function ensureFirebaseInitialized() {
  if (getApps().length === 0) {
    // RNFirebase typically auto-initializes from native config.
  }
  return getApp();
}
