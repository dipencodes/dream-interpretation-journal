import type { DreamRecord } from "../src/services/dreamStorage";
import { Alert } from "react-native";
import {
  getReviewPromptEligibility,
  maybePromptReviewAfterInterpretation,
} from "../src/services/reviewPrompt";
import {
  getHasCompletedOnboarding,
  getOnboardingCompletedAtMs,
  getReviewPromptCompleted,
  getReviewPromptLastDeclinedAtMs,
  getReviewPromptLegacyAnchorAtMs,
  setOnboardingCompletedAtMs,
  setReviewPromptCompleted,
  setReviewPromptLastDeclinedAtMs,
  setReviewPromptLegacyAnchorAtMs,
} from "../src/services/appPreferences";
import { getDreams } from "../src/services/dreamStorage";
import { getPlaygroundDreams } from "../src/services/playgroundStorage";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return {
    ...actual,
    Platform: {
      ...actual.Platform,
      OS: "ios",
    },
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(async () => {}),
      canOpenURL: jest.fn(async () => true),
    },
  };
});

jest.mock("../src/services/appPreferences", () => ({
  getHasCompletedOnboarding: jest.fn(),
  getOnboardingCompletedAtMs: jest.fn(),
  getReviewPromptCompleted: jest.fn(),
  getReviewPromptLastDeclinedAtMs: jest.fn(),
  getReviewPromptLegacyAnchorAtMs: jest.fn(),
  setOnboardingCompletedAtMs: jest.fn(),
  setReviewPromptCompleted: jest.fn(),
  setReviewPromptLastDeclinedAtMs: jest.fn(),
  setReviewPromptLegacyAnchorAtMs: jest.fn(),
}));

jest.mock("../src/services/dreamStorage", () => ({
  getDreams: jest.fn(),
}));

jest.mock("../src/services/playgroundStorage", () => ({
  getPlaygroundDreams: jest.fn(),
}));

const mockGetHasCompletedOnboarding = getHasCompletedOnboarding as jest.MockedFunction<
  typeof getHasCompletedOnboarding
>;
const mockGetOnboardingCompletedAtMs = getOnboardingCompletedAtMs as jest.MockedFunction<
  typeof getOnboardingCompletedAtMs
>;
const mockGetReviewPromptCompleted = getReviewPromptCompleted as jest.MockedFunction<
  typeof getReviewPromptCompleted
>;
const mockGetReviewPromptLastDeclinedAtMs = getReviewPromptLastDeclinedAtMs as jest.MockedFunction<
  typeof getReviewPromptLastDeclinedAtMs
>;
const mockGetReviewPromptLegacyAnchorAtMs = getReviewPromptLegacyAnchorAtMs as jest.MockedFunction<
  typeof getReviewPromptLegacyAnchorAtMs
>;
const mockSetOnboardingCompletedAtMs = setOnboardingCompletedAtMs as jest.MockedFunction<
  typeof setOnboardingCompletedAtMs
>;
const mockSetReviewPromptCompleted = setReviewPromptCompleted as jest.MockedFunction<
  typeof setReviewPromptCompleted
>;
const mockSetReviewPromptLastDeclinedAtMs = setReviewPromptLastDeclinedAtMs as jest.MockedFunction<
  typeof setReviewPromptLastDeclinedAtMs
>;
const mockSetReviewPromptLegacyAnchorAtMs = setReviewPromptLegacyAnchorAtMs as jest.MockedFunction<
  typeof setReviewPromptLegacyAnchorAtMs
>;
const mockGetDreams = getDreams as jest.MockedFunction<typeof getDreams>;
const mockGetPlaygroundDreams = getPlaygroundDreams as jest.MockedFunction<
  typeof getPlaygroundDreams
>;
const mockAlert = Alert.alert as jest.Mock;

const NOW = Date.UTC(2026, 3, 13, 12, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

function buildInterpretedDream(id: string, createdAt: number): DreamRecord {
  return {
    id,
    createdAt,
    dreamDate: "2026-04-01",
    dreamText: `Dream ${id}`,
    interpretationSummary: null,
    interpretation: "An interpretation",
    warning: null,
    sourceKey: "scientific",
  };
}

function buildBaseEligibleState() {
  mockGetHasCompletedOnboarding.mockResolvedValue(true);
  mockGetOnboardingCompletedAtMs.mockResolvedValue(NOW - 8 * DAY_MS);
  mockGetReviewPromptCompleted.mockResolvedValue(false);
  mockGetReviewPromptLastDeclinedAtMs.mockResolvedValue(null);
  mockGetReviewPromptLegacyAnchorAtMs.mockResolvedValue(null);
  mockSetOnboardingCompletedAtMs.mockResolvedValue();
  mockSetReviewPromptCompleted.mockResolvedValue();
  mockSetReviewPromptLastDeclinedAtMs.mockResolvedValue();
  mockSetReviewPromptLegacyAnchorAtMs.mockResolvedValue();
}

describe("review prompt eligibility and flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    buildBaseEligibleState();
    mockGetDreams.mockResolvedValue([
      buildInterpretedDream("d1", NOW - 15 * DAY_MS),
      buildInterpretedDream("d2", NOW - 14 * DAY_MS),
    ]);
    mockGetPlaygroundDreams.mockResolvedValue([
      buildInterpretedDream("d3", NOW - 13 * DAY_MS),
      buildInterpretedDream("d4", NOW - 12 * DAY_MS),
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("is eligible only when both 7-day age and 4+ unique interpreted dreams are met", async () => {
    const eligible = await getReviewPromptEligibility(NOW);
    expect(eligible.eligible).toBe(true);
    expect(eligible.interpretedDreamCount).toBe(4);

    mockGetPlaygroundDreams.mockResolvedValue([
      buildInterpretedDream("d1", NOW - 11 * DAY_MS),
      buildInterpretedDream("d3", NOW - 10 * DAY_MS),
    ]);

    const notEnoughUnique = await getReviewPromptEligibility(NOW);
    expect(notEnoughUnique.eligible).toBe(false);
    expect(notEnoughUnique.interpretedDreamCount).toBe(3);
  });

  it("derives onboarding date from earliest dream for legacy users when timestamp is missing", async () => {
    mockGetOnboardingCompletedAtMs.mockResolvedValue(null);
    mockGetDreams.mockResolvedValue([
      buildInterpretedDream("d1", NOW - 20 * DAY_MS),
      buildInterpretedDream("d2", NOW - 16 * DAY_MS),
    ]);
    mockGetPlaygroundDreams.mockResolvedValue([
      buildInterpretedDream("d3", NOW - 18 * DAY_MS),
      buildInterpretedDream("d4", NOW - 17 * DAY_MS),
    ]);

    const result = await getReviewPromptEligibility(NOW);
    expect(result.eligible).toBe(true);
    expect(mockSetOnboardingCompletedAtMs).toHaveBeenCalledWith(NOW - 20 * DAY_MS);
  });

  it("uses legacy anchor when onboarding timestamp is missing and dreams have no valid date", async () => {
    mockGetOnboardingCompletedAtMs.mockResolvedValue(null);
    mockGetReviewPromptLegacyAnchorAtMs.mockResolvedValue(null);
    mockGetDreams.mockResolvedValue([
      { ...buildInterpretedDream("d1", 0), createdAt: 0 },
      { ...buildInterpretedDream("d2", 0), createdAt: 0 },
    ]);
    mockGetPlaygroundDreams.mockResolvedValue([
      { ...buildInterpretedDream("d3", 0), createdAt: 0 },
      { ...buildInterpretedDream("d4", 0), createdAt: 0 },
    ]);

    const result = await getReviewPromptEligibility(NOW);
    expect(result.eligible).toBe(false);
    expect(mockSetReviewPromptLegacyAnchorAtMs).toHaveBeenCalledWith(NOW);
  });

  it("respects 30-day cooldown after decline", async () => {
    mockGetReviewPromptLastDeclinedAtMs.mockResolvedValue(NOW - 10 * DAY_MS);

    const result = await getReviewPromptEligibility(NOW);
    expect(result.eligible).toBe(false);
  });

  it("marks prompt completed on yes path and records decline on no path", async () => {
    mockAlert.mockImplementationOnce((_title, _message, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    mockAlert.mockImplementationOnce((_title, _message, buttons) => {
      buttons?.[0]?.onPress?.();
    });

    const yesResult = await maybePromptReviewAfterInterpretation();
    expect(yesResult).toBe(true);
    expect(mockSetReviewPromptCompleted).toHaveBeenCalledWith(true);
    expect(mockSetReviewPromptLastDeclinedAtMs).not.toHaveBeenCalled();

    jest.clearAllMocks();
    buildBaseEligibleState();
    mockGetDreams.mockResolvedValue([
      buildInterpretedDream("d1", NOW - 15 * DAY_MS),
      buildInterpretedDream("d2", NOW - 14 * DAY_MS),
    ]);
    mockGetPlaygroundDreams.mockResolvedValue([
      buildInterpretedDream("d3", NOW - 13 * DAY_MS),
      buildInterpretedDream("d4", NOW - 12 * DAY_MS),
    ]);

    mockAlert.mockImplementationOnce((_title, _message, buttons) => {
      buttons?.[0]?.onPress?.();
    });
    mockAlert.mockImplementationOnce(() => {});

    const noResult = await maybePromptReviewAfterInterpretation();
    expect(noResult).toBe(true);
    expect(mockSetReviewPromptLastDeclinedAtMs).toHaveBeenCalledWith(NOW);
    expect(mockSetReviewPromptCompleted).not.toHaveBeenCalled();
  });
});
