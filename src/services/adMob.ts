import mobileAds, { AdsConsent } from "react-native-google-mobile-ads";

let initializePromise: Promise<void> | null = null;

export async function initializeAdMobSdk(): Promise<void> {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    try {
      await AdsConsent.gatherConsent();
    } catch {
      // Keep ad setup resilient if consent retrieval fails unexpectedly.
    }

    try {
      await mobileAds().initialize();
    } catch {
      // Never block app behavior if ad SDK initialization fails.
    }
  })();

  await initializePromise;
}
