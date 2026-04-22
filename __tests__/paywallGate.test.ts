import { getFreeCreditStatus } from "../src/services/paywallGate";
import { getIsPremium, syncRevenueCatUser } from "../src/services/revenuecat";
import { getOrCreateUserGate, setUserGateState } from "../src/services/userGate";

jest.mock("../src/services/revenuecat", () => ({
  getIsPremium: jest.fn(),
  syncRevenueCatUser: jest.fn(),
}));

jest.mock("../src/services/userGate", () => ({
  getOrCreateUserGate: jest.fn(),
  setUserGateState: jest.fn(),
}));

const mockGetIsPremium = getIsPremium as jest.MockedFunction<typeof getIsPremium>;
const mockSyncRevenueCatUser = syncRevenueCatUser as jest.MockedFunction<typeof syncRevenueCatUser>;
const mockGetOrCreateUserGate = getOrCreateUserGate as jest.MockedFunction<
  typeof getOrCreateUserGate
>;
const mockSetUserGateState = setUserGateState as jest.MockedFunction<typeof setUserGateState>;

const NOW = Date.UTC(2026, 3, 12, 12, 0, 0);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("getFreeCreditStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    mockSyncRevenueCatUser.mockResolvedValue();
    mockGetIsPremium.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns onboarding + weekly as total free credits for a new user gate", async () => {
    mockGetOrCreateUserGate.mockResolvedValue({
      uid: "u1",
      onboardingFreeUsed: false,
      weeklyUsesCount: 0,
      weeklyWindowStartedAt: NOW,
      rewardedCredits: 0,
      rewardedDailyCount: 0,
      rewardedWindowStartedAt: NOW,
    });

    const result = await getFreeCreditStatus("u1");

    expect(result).toEqual({
      isPremium: false,
      totalFreeCreditsAvailable: 2,
      remainingDailyRewarded: 3,
      rewardedResetsAt: NOW + ONE_DAY_MS,
    });
    expect(mockSetUserGateState).not.toHaveBeenCalled();
  });

  it("counts rewarded credits after onboarding and weekly free credits are consumed", async () => {
    mockGetOrCreateUserGate.mockResolvedValue({
      uid: "u1",
      onboardingFreeUsed: true,
      weeklyUsesCount: 1,
      weeklyWindowStartedAt: NOW,
      rewardedCredits: 2,
      rewardedDailyCount: 1,
      rewardedWindowStartedAt: NOW,
    });

    const result = await getFreeCreditStatus("u1");

    expect(result.totalFreeCreditsAvailable).toBe(2);
    expect(result.remainingDailyRewarded).toBe(2);
  });

  it("resets expired windows before calculating totals", async () => {
    mockGetOrCreateUserGate.mockResolvedValue({
      uid: "u1",
      onboardingFreeUsed: true,
      weeklyUsesCount: 1,
      weeklyWindowStartedAt: NOW - 8 * ONE_DAY_MS,
      rewardedCredits: 1,
      rewardedDailyCount: 3,
      rewardedWindowStartedAt: NOW - 2 * ONE_DAY_MS,
    });

    const result = await getFreeCreditStatus("u1");

    expect(result.totalFreeCreditsAvailable).toBe(2);
    expect(result.remainingDailyRewarded).toBe(3);
    expect(result.rewardedResetsAt).toBe(NOW + ONE_DAY_MS);
    expect(mockSetUserGateState).toHaveBeenCalledWith("u1", {
      onboardingFreeUsed: true,
      weeklyUsesCount: 0,
      weeklyWindowStartedAt: NOW,
      rewardedCredits: 1,
      rewardedDailyCount: 0,
      rewardedWindowStartedAt: NOW,
    });
  });

  it("reports premium users while still returning synchronized free-credit totals", async () => {
    mockGetIsPremium.mockResolvedValue(true);
    mockGetOrCreateUserGate.mockResolvedValue({
      uid: "u1",
      onboardingFreeUsed: false,
      weeklyUsesCount: 0,
      weeklyWindowStartedAt: NOW,
      rewardedCredits: 4,
      rewardedDailyCount: 2,
      rewardedWindowStartedAt: NOW,
    });

    const result = await getFreeCreditStatus("u1");

    expect(result.isPremium).toBe(true);
    expect(result.totalFreeCreditsAvailable).toBe(6);
  });
});
