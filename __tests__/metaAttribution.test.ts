jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return {
    ...actual,
    Platform: {
      ...actual.Platform,
      OS: "ios",
    },
    NativeModules: {
      ...actual.NativeModules,
      FBAccessToken: {},
      FBAppEventsLogger: {},
      FBSettings: {},
    },
  };
});

import { AppEventsLogger } from "react-native-fbsdk-next";
import { logMetaFunnelEvent } from "../src/services/metaAttribution";

describe("meta attribution event mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs rewarded_credit_granted as a custom Facebook event with sanitized params", async () => {
    await logMetaFunnelEvent("rewarded_credit_granted", {
      entry: "gate",
      remaining_daily_rewarded: 2,
      ignored_boolean: true,
    });

    expect(AppEventsLogger.logEvent).toHaveBeenLastCalledWith("rewarded_credit_granted", {
      entry: "gate",
      remaining_daily_rewarded: 2,
    });
  });
});
