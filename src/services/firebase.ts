// src/services/firebase.ts
import firebaseApp from "@react-native-firebase/app";

export function ensureFirebaseInitialized() {
  // RNFirebase initializes from native config automatically.
  // This function just ensures the app module is loaded and ready.
  if (firebaseApp.apps.length === 0) {
    // In RNFirebase, apps are typically created automatically.
    // If you ever need manual init, you'd do it here.
  }
  return firebaseApp.app();
}
