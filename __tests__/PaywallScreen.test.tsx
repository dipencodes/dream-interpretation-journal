import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { AdEventType, RewardedAd, RewardedAdEventType } from "react-native-google-mobile-ads";
import { PaywallScreen } from "../src/screens/PaywallScreen";
import { ensureAnonymousAuth } from "../src/services/auth";
import { getFreeCreditStatus, grantRewardedCredit } from "../src/services/paywallGate";
import { trackRewardedCreditGranted } from "../src/services/tracking";

jest.mock("../src/services/auth", () => ({
  ensureAnonymousAuth: jest.fn(),
}));

jest.mock("../src/services/paywallGate", () => ({
  getFreeCreditStatus: jest.fn(),
  grantRewardedCredit: jest.fn(),
}));

jest.mock("../src/services/revenuecat", () => ({
  getActiveSubscriptionPlanInterval: jest.fn(async () => "unknown"),
  syncRevenueCatUser: jest.fn(async () => {}),
}));

jest.mock("../src/services/metaAttribution", () => ({
  ensureMetaTrackingConsentBeforePaywall: jest.fn(async () => {}),
}));

jest.mock("../src/services/paywallContinuation", () => ({
  markPaywallContinuationRewarded: jest.fn(async () => {}),
}));

jest.mock("../src/services/adMob", () => ({
  initializeAdMobSdk: jest.fn(async () => {}),
}));

jest.mock("../src/services/tracking", () => ({
  normalizeTrackingErrorCode: jest.fn(() => "unknown"),
  trackPaywallClosed: jest.fn(async () => {}),
  trackPaywallCheckoutStarted: jest.fn(async () => {}),
  trackPaywallRewardedOptionViewed: jest.fn(async () => {}),
  trackPaywallViewed: jest.fn(async () => {}),
  trackRewardedAdCapReached: jest.fn(async () => {}),
  trackRewardedAdLoadFailed: jest.fn(async () => {}),
  trackRewardedAdLoadSucceeded: jest.fn(async () => {}),
  trackRewardedAdRewardEarned: jest.fn(async () => {}),
  trackRewardedCreditGranted: jest.fn(async () => {}),
  trackRewardedAdShowFailed: jest.fn(async () => {}),
  trackRewardedAdShowSucceeded: jest.fn(async () => {}),
  trackSubscriptionPurchaseSuccess: jest.fn(async () => {}),
}));

const mockEnsureAnonymousAuth = ensureAnonymousAuth as jest.MockedFunction<
  typeof ensureAnonymousAuth
>;
const mockGetFreeCreditStatus = getFreeCreditStatus as jest.MockedFunction<typeof getFreeCreditStatus>;
const mockGrantRewardedCredit = grantRewardedCredit as jest.MockedFunction<
  typeof grantRewardedCredit
>;
const mockTrackRewardedCreditGranted = trackRewardedCreditGranted as jest.MockedFunction<
  typeof trackRewardedCreditGranted
>;

function flattenText(children: React.ReactNode): string {
  if (Array.isArray(children)) {
    return children.map(flattenText).join("");
  }
  if (children === null || children === undefined || typeof children === "boolean") {
    return "";
  }
  return String(children);
}

function hasText(root: ReactTestRenderer.ReactTestInstance, text: string): boolean {
  return (
    root.findAll(
      (node) => node.type === "Text" && flattenText(node.props.children).includes(text)
    ).length > 0
  );
}

function findPressableByText(
  root: ReactTestRenderer.ReactTestInstance,
  text: string
): ReactTestRenderer.ReactTestInstance {
  const pressables = root.findAll((node) => typeof node.props?.onPress === "function");
  const target = pressables.find((node) =>
    node.findAll(
      (child) => child.type === "Text" && flattenText(child.props.children).includes(text)
    ).length > 0
  );

  if (!target) {
    throw new Error(`Could not find pressable with text: ${text}`);
  }

  return target;
}

function createRewardedAdMock(options: { earnReward: boolean }) {
  const listeners = new Map<string, Set<(payload?: unknown) => void>>();

  const emit = (eventType: string, payload?: unknown) => {
    const eventListeners = listeners.get(eventType);
    if (!eventListeners) return;
    eventListeners.forEach((listener) => listener(payload));
  };

  return {
    addAdEventListener: (eventType: string, listener: (payload?: unknown) => void) => {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
      }
      listeners.get(eventType)?.add(listener);
      return () => listeners.get(eventType)?.delete(listener);
    },
    load: () => {
      emit(RewardedAdEventType.LOADED);
    },
    show: async () => {
      if (options.earnReward) {
        emit(RewardedAdEventType.EARNED_REWARD, { amount: 1, type: "interpretation" });
      }
      emit(AdEventType.CLOSED);
    },
  };
}

async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe("PaywallScreen credit display", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(RewardedAd, "createForAdRequest").mockImplementation(
      () => createRewardedAdMock({ earnReward: true }) as any
    );
    mockEnsureAnonymousAuth.mockResolvedValue({ uid: "u1" });
    mockGetFreeCreditStatus.mockResolvedValue({
      isPremium: false,
      totalFreeCreditsAvailable: 5,
      remainingDailyRewarded: 2,
      rewardedResetsAt: Date.UTC(2026, 3, 13, 12, 0, 0),
    });
    mockGrantRewardedCredit.mockResolvedValue({
      granted: true,
      rewardedCredits: 6,
      remainingDaily: 1,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows reward-mode copy with totals and hides premium CTA", async () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      reset: jest.fn(),
    };
    const route = {
      key: "paywall-reward",
      name: "Paywall",
      params: { entry: "reward" },
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PaywallScreen navigation={navigation as any} route={route as any} />
      );
    });
    await flushAsync();

    expect(hasText(renderer!.root, "Earn free credits")).toBe(true);
    expect(hasText(renderer!.root, "Total free credits available: 5")).toBe(true);
    expect(hasText(renderer!.root, "Ad credits left today: 2")).toBe(true);
    expect(hasText(renderer!.root, "Explore Premium")).toBe(false);
  });

  it("shows same total credit values in gate mode and keeps premium CTA", async () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      reset: jest.fn(),
    };
    const route = {
      key: "paywall-gate",
      name: "Paywall",
      params: { entry: "gate" },
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PaywallScreen navigation={navigation as any} route={route as any} />
      );
    });
    await flushAsync();

    expect(hasText(renderer!.root, "Total free credits available: 5")).toBe(true);
    expect(hasText(renderer!.root, "Ad credits left today: 2")).toBe(true);
    expect(hasText(renderer!.root, "Explore Premium")).toBe(true);
  });

  it("tracks rewarded_credit_granted with entry and remaining count when grant succeeds", async () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      reset: jest.fn(),
    };
    const route = {
      key: "paywall-reward-success",
      name: "Paywall",
      params: { entry: "reward" },
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PaywallScreen navigation={navigation as any} route={route as any} />
      );
    });
    await flushAsync();

    const watchButton = findPressableByText(renderer!.root, "Watch ad for 1 free interpretation");
    await act(async () => {
      watchButton.props.onPress();
      await Promise.resolve();
    });
    await flushAsync();

    expect(mockTrackRewardedCreditGranted).toHaveBeenCalledWith({
      entry: "reward",
      remaining_daily_rewarded: 1,
    });
  });

  it("does not track rewarded_credit_granted when grant fails or reward is not earned", async () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      reset: jest.fn(),
    };
    const route = {
      key: "paywall-gate-no-reward",
      name: "Paywall",
      params: { entry: "gate" },
    };

    mockGrantRewardedCredit.mockResolvedValueOnce({
      granted: false,
      reason: "daily_cap_reached",
      remainingDaily: 0,
      resetsAt: Date.UTC(2026, 3, 13, 12, 0, 0),
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PaywallScreen navigation={navigation as any} route={route as any} />
      );
    });
    await flushAsync();

    const watchButton = findPressableByText(renderer!.root, "Watch ad for 1 free interpretation");
    await act(async () => {
      watchButton.props.onPress();
      await Promise.resolve();
    });
    await flushAsync();

    expect(mockTrackRewardedCreditGranted).not.toHaveBeenCalled();

    (RewardedAd.createForAdRequest as jest.Mock).mockReturnValueOnce(
      createRewardedAdMock({ earnReward: false }) as any
    );

    await act(async () => {
      watchButton.props.onPress();
      await Promise.resolve();
    });
    await flushAsync();

    expect(mockTrackRewardedCreditGranted).not.toHaveBeenCalled();
    expect(mockGrantRewardedCredit).toHaveBeenCalledTimes(1);
  });
});
