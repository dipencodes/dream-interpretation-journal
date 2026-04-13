import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { SettingsScreen } from "../src/screens/SettingsScreen";
import { ensureAnonymousAuth } from "../src/services/auth";
import { getFreeCreditStatus } from "../src/services/paywallGate";
import { getSubscriptionStatus, openSubscriptionManagement } from "../src/services/revenuecat";

jest.mock("../src/services/auth", () => ({
  ensureAnonymousAuth: jest.fn(),
}));

jest.mock("../src/services/paywallGate", () => ({
  getFreeCreditStatus: jest.fn(),
}));

jest.mock("../src/services/revenuecat", () => ({
  getSubscriptionStatus: jest.fn(),
  openSubscriptionManagement: jest.fn(),
}));

const mockEnsureAnonymousAuth = ensureAnonymousAuth as jest.MockedFunction<
  typeof ensureAnonymousAuth
>;
const mockGetFreeCreditStatus = getFreeCreditStatus as jest.MockedFunction<typeof getFreeCreditStatus>;
const mockGetSubscriptionStatus = getSubscriptionStatus as jest.MockedFunction<
  typeof getSubscriptionStatus
>;
const mockOpenSubscriptionManagement = openSubscriptionManagement as jest.MockedFunction<
  typeof openSubscriptionManagement
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

async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe("SettingsScreen credits UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenSubscriptionManagement.mockResolvedValue(undefined);
    mockEnsureAnonymousAuth.mockResolvedValue({ uid: "u1" });
  });

  it("shows total free credits and opens reward paywall from add button for non-premium users", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({
      isPremiumActive: false,
      willRenew: null,
      expirationDate: null,
      unsubscribeDetectedAt: null,
      managementURL: null,
      store: null,
    });
    mockGetFreeCreditStatus.mockResolvedValue({
      isPremium: false,
      totalFreeCreditsAvailable: 4,
      remainingDailyRewarded: 2,
      rewardedResetsAt: 12345,
    });

    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      reset: jest.fn(),
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SettingsScreen navigation={navigation as any} route={{} as any} />
      );
    });
    await flushAsync();

    expect(hasText(renderer!.root, "Free Credits")).toBe(true);
    expect(hasText(renderer!.root, "4")).toBe(true);
    expect(hasText(renderer!.root, "Ad credits left today: 2")).toBe(true);
    expect(hasText(renderer!.root, "Add Free Credit")).toBe(true);

    const addCreditButton = findPressableByText(renderer!.root, "Add Free Credit");
    await act(async () => {
      addCreditButton.props.onPress();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("Paywall", { entry: "reward" });
  });

  it("shows unlimited and hides add button for premium users", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({
      isPremiumActive: true,
      willRenew: true,
      expirationDate: "2026-04-30T00:00:00.000Z",
      unsubscribeDetectedAt: null,
      managementURL: null,
      store: null,
    });
    mockGetFreeCreditStatus.mockResolvedValue({
      isPremium: true,
      totalFreeCreditsAvailable: 7,
      remainingDailyRewarded: 1,
      rewardedResetsAt: 12345,
    });

    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      reset: jest.fn(),
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SettingsScreen navigation={navigation as any} route={{} as any} />
      );
    });
    await flushAsync();

    expect(hasText(renderer!.root, "Unlimited")).toBe(true);
    expect(hasText(renderer!.root, "Add Free Credit")).toBe(false);
  });
});
