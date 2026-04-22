import {
  canRunAiInterpretation,
  getFreeCreditStatus,
  grantRewardedCredit,
  grantUnavailableAdFallbackCredit,
} from "../src/services/paywallGate";
import { ensureAnonymousAuth } from "../src/services/auth";
import { getIsPremium, syncRevenueCatUser } from "../src/services/revenuecat";
import { getOrCreateUserGate, setUserGateState } from "../src/services/userGate";

jest.mock("../src/services/auth", () => ({
  ensureAnonymousAuth: jest.fn(),
}));

jest.mock("../src/services/revenuecat", () => ({
  getIsPremium: jest.fn(),
  syncRevenueCatUser: jest.fn(),
}));

jest.mock("../src/services/userGate", () => ({
  getOrCreateUserGate: jest.fn(),
  setUserGateState: jest.fn(),
}));

const mockEnsureAnonymousAuth = ensureAnonymousAuth as jest.MockedFunction<typeof ensureAnonymousAuth>;
const mockGetIsPremium = getIsPremium as jest.MockedFunction<typeof getIsPremium>;
const mockSyncRevenueCatUser = syncRevenueCatUser as jest.MockedFunction<typeof syncRevenueCatUser>;
const mockGetOrCreateUserGate = getOrCreateUserGate as jest.MockedFunction<
  typeof getOrCreateUserGate
>;
const mockSetUserGateState = setUserGateState as jest.MockedFunction<typeof setUserGateState>;

const NOW = Date.UTC(2026, 3, 12, 12, 0, 0);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

function makeGate(overrides?: Partial<Awaited<ReturnType<typeof getOrCreateUserGate>>>) {
  return {
    uid: "u1",
    onboardingFreeUsed: true,
    onboardingFallbackUsed: false,
    weeklyUsesCount: 0,
    weeklyWindowStartedAt: NOW,
    rewardedCredits: 0,
    rewardedDailyCount: 0,
    rewardedWindowStartedAt: NOW,
    ...overrides,
  };
}

describe("paywallGate rewarded + weekly fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(NOW);

    mockEnsureAnonymousAuth.mockResolvedValue({ uid: "u1" });
    mockSyncRevenueCatUser.mockResolvedValue();
    mockGetIsPremium.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("blocks users with zero credits (no built-in free access)", async () => {
    mockGetOrCreateUserGate.mockResolvedValue(makeGate({ rewardedCredits: 0 }));

    const result = await canRunAiInterpretation();

    expect(result).toEqual({ allowed: false, reason: "blocked", uid: "u1" });
  });

  it("allows users when rewarded credits exist", async () => {
    mockGetOrCreateUserGate.mockResolvedValue(makeGate({ rewardedCredits: 2 }));

    const result = await canRunAiInterpretation();

    expect(result).toEqual({ allowed: true, reason: "rewarded", uid: "u1" });
  });

  it("reports day-1 rewarded availability in free-credit status", async () => {
    mockGetOrCreateUserGate.mockResolvedValue(
      makeGate({ rewardedCredits: 4, rewardedDailyCount: 1 })
    );

    const result = await getFreeCreditStatus("u1");

    expect(result).toEqual({
      isPremium: false,
      totalFreeCreditsAvailable: 4,
      remainingDailyRewarded: 2,
      rewardedResetsAt: NOW + ONE_DAY_MS,
    });
  });

  it("grants rewarded credits from day 1", async () => {
    mockGetOrCreateUserGate.mockResolvedValue(makeGate({ rewardedCredits: 1, rewardedDailyCount: 1 }));

    const result = await grantRewardedCredit("u1");

    expect(result).toEqual({
      granted: true,
      rewardedCredits: 2,
      remainingDaily: 1,
    });
    expect(mockSetUserGateState).toHaveBeenCalledWith("u1", {
      rewardedCredits: 2,
      rewardedDailyCount: 2,
      rewardedWindowStartedAt: NOW,
    });
  });

  it("grants unavailable-ad fallback credit once per week", async () => {
    mockGetOrCreateUserGate
      .mockResolvedValueOnce(makeGate({ weeklyUsesCount: 0, rewardedCredits: 0 }))
      .mockResolvedValueOnce(makeGate({ weeklyUsesCount: 1, rewardedCredits: 1 }));

    const firstResult = await grantUnavailableAdFallbackCredit("u1");
    const secondResult = await grantUnavailableAdFallbackCredit("u1");

    expect(firstResult).toEqual({
      granted: true,
      rewardedCredits: 1,
      nextEligibleAt: NOW + ONE_WEEK_MS,
    });
    expect(secondResult).toEqual({
      granted: false,
      reason: "weekly_cap_reached",
      nextEligibleAt: NOW + ONE_WEEK_MS,
    });
    expect(mockSetUserGateState).toHaveBeenCalledWith("u1", {
      weeklyUsesCount: 1,
      weeklyWindowStartedAt: NOW,
      rewardedCredits: 1,
      rewardedDailyCount: 0,
      rewardedWindowStartedAt: NOW,
    });
  });

  it("resets weekly fallback window after 7 days", async () => {
    mockGetOrCreateUserGate.mockResolvedValue(
      makeGate({
        weeklyUsesCount: 1,
        weeklyWindowStartedAt: NOW - 8 * ONE_DAY_MS,
        rewardedCredits: 2,
      })
    );

    const result = await grantUnavailableAdFallbackCredit("u1");

    expect(result).toEqual({
      granted: true,
      rewardedCredits: 3,
      nextEligibleAt: NOW + ONE_WEEK_MS,
    });
    expect(mockSetUserGateState).toHaveBeenCalledWith("u1", {
      weeklyUsesCount: 1,
      weeklyWindowStartedAt: NOW,
      rewardedCredits: 3,
      rewardedDailyCount: 0,
      rewardedWindowStartedAt: NOW,
    });
  });
});
