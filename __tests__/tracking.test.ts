const mockFirebaseSetUserId = jest.fn(async () => {});
const mockFirebaseLogEvent = jest.fn(async () => {});
const mockMetaLogEvent = jest.fn(async () => {});
const mockMetaSetUserId = jest.fn(async () => {});

jest.mock("@react-native-firebase/analytics", () =>
  jest.fn(() => ({
    setUserId: mockFirebaseSetUserId,
    logEvent: mockFirebaseLogEvent,
  }))
);

jest.mock("../src/services/metaAttribution", () => ({
  logMetaFunnelEvent: mockMetaLogEvent,
  setMetaUserId: mockMetaSetUserId,
}));

import {
  trackInterpretationStarted,
  trackPaywallViewed,
  trackRewardedCreditGranted,
} from "../src/services/tracking";

describe("tracking provider routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends rewarded_credit_granted to Firebase and Meta with params", async () => {
    const params = {
      entry: "reward" as const,
      remaining_daily_rewarded: 1,
    };

    await trackRewardedCreditGranted(params);

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith("rewarded_credit_granted", params);
    expect(mockMetaLogEvent).toHaveBeenCalledWith("rewarded_credit_granted", params);
  });

  it("keeps existing paywall meta mapping and does not forward unrelated events to Meta", async () => {
    await trackPaywallViewed();
    expect(mockMetaLogEvent).toHaveBeenCalledWith("paywall_viewed", undefined);

    await trackInterpretationStarted({
      method: "jung",
      source_screen: "dream_summary",
    });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith("interpretation_started", {
      method: "jung",
      source_screen: "dream_summary",
    });
    expect(mockMetaLogEvent).toHaveBeenCalledTimes(1);
  });
});
