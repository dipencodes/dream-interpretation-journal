import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import Svg, { Circle, Line, Path } from "react-native-svg";
import type {
  DreamPostCreateBackTarget,
  RootStackParamList,
} from "../navigation/types";
import { t } from "../i18n";
import { ensureAnonymousAuth } from "../services/auth";
import { saveDream, type DreamRecord } from "../services/dreamStorage";
import { savePlaygroundDream } from "../services/playgroundStorage";
import {
  setDefaultInterpretMethod,
  type InterpretMethodKey,
} from "../services/appPreferences";
import { canRunAiInterpretation, consumeGateUse } from "../services/paywallGate";
import { refreshMorningReminderSchedule } from "../services/notifications";
import {
  normalizeTrackingErrorCode,
  trackRewardedAutoResumeFailed,
  trackRewardedAutoResumeSucceeded,
  trackInterpretationFailed,
  trackInterpretationStarted,
  trackInterpretationSucceeded,
} from "../services/tracking";
import {
  consumePaywallContinuationRewarded,
  createPaywallContinuationToken,
} from "../services/paywallContinuation";

type Props = NativeStackScreenProps<RootStackParamList, "DreamInterpretMethod">;

type MethodOption = {
  key: InterpretMethodKey;
  title: string;
};

const METHOD_OPTIONS: MethodOption[] = [
  { key: "hindu", title: "Hinduism" },
  { key: "buddhist", title: "Buddhism" },
  { key: "christian", title: "Christianity" },
  { key: "islamic", title: "Islam" },
  { key: "scientific", title: "Scientific" },
];

function getBackTargetRouteName(target: DreamPostCreateBackTarget) {
  if (target === "home") return "Home";
  if (target === "playground") return "Playground";
  return "Journal";
}

function MethodIcon({ method }: { method: InterpretMethodKey }) {
  const stroke = "#D97706";
  switch (method) {
    case "hindu":
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="4" stroke={stroke} strokeWidth="2" />
          <Line x1="12" y1="2" x2="12" y2="6" stroke={stroke} strokeWidth="2" />
          <Line x1="12" y1="18" x2="12" y2="22" stroke={stroke} strokeWidth="2" />
          <Line x1="2" y1="12" x2="6" y2="12" stroke={stroke} strokeWidth="2" />
          <Line x1="18" y1="12" x2="22" y2="12" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "buddhist":
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M12 4C8.5 8 8.5 13 12 18C15.5 13 15.5 8 12 4Z" stroke={stroke} strokeWidth="2" />
          <Path d="M5 19C7 17.5 9 17.5 11 19" stroke={stroke} strokeWidth="2" />
          <Path d="M13 19C15 17.5 17 17.5 19 19" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "christian":
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Line x1="12" y1="4" x2="12" y2="20" stroke={stroke} strokeWidth="2.4" />
          <Line x1="7" y1="9" x2="17" y2="9" stroke={stroke} strokeWidth="2.4" />
        </Svg>
      );
    case "islamic":
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M15 4C10.6 4 7 7.6 7 12C7 16.4 10.6 20 15 20C12.2 18.6 10.2 15.6 10.2 12C10.2 8.4 12.2 5.4 15 4Z" stroke={stroke} strokeWidth="2" />
          <Circle cx="17.5" cy="9" r="1.2" fill={stroke} />
        </Svg>
      );
    case "scientific":
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="1.8" fill={stroke} />
          <Path d="M6 12C6 9 8.7 6.5 12 6.5C15.3 6.5 18 9 18 12C18 15 15.3 17.5 12 17.5C8.7 17.5 6 15 6 12Z" stroke={stroke} strokeWidth="2" />
          <Path d="M8.1 7.7C10.8 6.1 14.2 7.3 15.8 10C17.4 12.7 16.3 16.1 13.6 17.7C10.9 19.3 7.5 18.2 5.9 15.5C4.3 12.8 5.4 9.4 8.1 7.7Z" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    default:
      return null;
  }
}

export function DreamInterpretMethodScreen({ route, navigation }: Props) {
  const {
    dreamDate,
    dreamText,
    moodLabel,
    moodIcon,
    selectedMoodId,
    presetMethod,
    context = "journal",
    postCreateBackTarget,
  } = route.params;
  const [selectedMethod, setSelectedMethod] = useState<InterpretMethodKey | null>(
    presetMethod ?? null
  );
  const [makeDefault, setMakeDefault] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [pendingContinuationToken, setPendingContinuationToken] = useState<string | null>(null);

  const confirmUseWeeklyFreeInterpretation = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert(t.paywall.weeklyFreeConfirmTitle, t.paywall.weeklyFreeConfirmMessage, [
        {
          text: t.paywall.weeklyFreeConfirmNoCta,
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: t.paywall.weeklyFreeConfirmYesCta,
          onPress: () => resolve(true),
        },
      ]);
    });

  const canInterpret = useMemo(() => Boolean(selectedMethod) && !isInterpreting, [selectedMethod, isInterpreting]);

  const persistDream = async (record: DreamRecord) => {
    if (context === "playground") {
      await savePlaygroundDream(record);
      return;
    }

    await saveDream(record);
    await refreshMorningReminderSchedule().catch(() => {
      // Keep dream save flow resilient if notifications cannot be refreshed.
    });
  };

  const navigateToSummary = (record: DreamRecord) => {
    if (!postCreateBackTarget) {
      navigation.navigate("DreamSummary", { dream: record, context });
      return;
    }

    const targetRouteName = getBackTargetRouteName(postCreateBackTarget);
    navigation.reset({
      index: 1,
      routes: [
        { name: targetRouteName },
        { name: "DreamSummary", params: { dream: record, context } },
      ],
    });
  };

  const onInterpret = useCallback(async (options?: { throwOnError?: boolean }) => {
    if (!selectedMethod || isInterpreting) return;
    let didStartInterpretation = false;
    try {
      const gate = await canRunAiInterpretation();
      if (!gate.allowed) {
        const continuationToken = createPaywallContinuationToken();
        setPendingContinuationToken(continuationToken);
        navigation.navigate("Paywall", {
          entry: "gate",
          continuationToken,
        });
        return;
      }

      if (gate.reason === "free" && gate.freeAccessType === "weekly") {
        const shouldUseWeeklyFree = await confirmUseWeeklyFreeInterpretation();
        if (!shouldUseWeeklyFree) {
          return;
        }
      }

      setIsInterpreting(true);
      await ensureAnonymousAuth();

      if (makeDefault) {
        await setDefaultInterpretMethod(selectedMethod);
      }

      await trackInterpretationStarted({
        method: selectedMethod,
        source_screen: "dream_interpret_method",
      });
      didStartInterpretation = true;

      const functionsInstance = getFunctions(getApp());
      const callable = httpsCallable(functionsInstance, "interpretDream");
      const result = await callable({
        dreamText,
        dreamDate,
        sourceKey: selectedMethod,
      });

      const data = result.data as {
        summary?: string | null;
        interpretation: string;
        warning: string | null;
      };
      const record: DreamRecord = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        dreamDate,
        dreamText,
        sourceKey: selectedMethod,
        interpretationSummary: data.summary ?? null,
        interpretation: data.interpretation,
        warning: data.warning ?? null,
        moodLabel,
        moodIcon: moodIcon || selectedMoodId,
        interpretations: {
          [selectedMethod]: {
            summary: data.summary ?? null,
            interpretation: data.interpretation,
            warning: data.warning ?? null,
          },
        },
      };

      await persistDream(record);
      await trackInterpretationSucceeded({
        method: selectedMethod,
        source_screen: "dream_interpret_method",
      });
      await consumeGateUse(gate);
      navigateToSummary(record);
    } catch (error: unknown) {
      if (didStartInterpretation && selectedMethod) {
        await trackInterpretationFailed({
          method: selectedMethod,
          source_screen: "dream_interpret_method",
          error_code: normalizeTrackingErrorCode(error),
        });
      }
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : t.dreamInterpretMethod.error;
      Alert.alert("Error", errorMessage);
      if (options?.throwOnError) {
        throw error;
      }
    } finally {
      setIsInterpreting(false);
    }
  }, [
    confirmUseWeeklyFreeInterpretation,
    context,
    dreamDate,
    dreamText,
    isInterpreting,
    makeDefault,
    moodIcon,
    moodLabel,
    navigation,
    postCreateBackTarget,
    selectedMethod,
    selectedMoodId,
  ]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (!pendingContinuationToken) {
        return () => {
          cancelled = true;
        };
      }

      (async () => {
        const shouldAutoResume = await consumePaywallContinuationRewarded(
          pendingContinuationToken
        );
        setPendingContinuationToken(null);

        if (!shouldAutoResume || cancelled) {
          return;
        }

        try {
          await onInterpret({ throwOnError: true });
          await trackRewardedAutoResumeSucceeded({
            source_screen: "dream_interpret_method",
          });
        } catch (error) {
          await trackRewardedAutoResumeFailed({
            source_screen: "dream_interpret_method",
            error_code: normalizeTrackingErrorCode(error),
          });
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [onInterpret, pendingContinuationToken])
  );

  return (
    <View className="flex-1 bg-bg-base">
      <View pointerEvents="none" className="absolute inset-0">
        <View
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 260,
            height: 260,
            borderRadius: 9999,
            backgroundColor: "#F28C28",
            opacity: 0.1,
          }}
        />
      </View>

      <ScrollView className="flex-1 px-6 pt-14" contentContainerStyle={{ paddingBottom: 28 }}>
        <Text className="text-text-primary text-center text-3xl font-semibold">
          {t.dreamInterpretMethod.title}
        </Text>
        <Text className="text-text-secondary mt-2 text-center text-[15px] leading-6">
          {t.dreamInterpretMethod.subtitle}
        </Text>

        <View className="mt-6 flex-row flex-wrap justify-between">
          {METHOD_OPTIONS.map((option) => {
            const selected = selectedMethod === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setSelectedMethod(option.key)}
                className={[
                  "mb-3 w-[48%] rounded-3xl border bg-bg-surface p-4 active:opacity-90",
                  selected ? "border-brand-primary" : "border-border-subtle",
                ].join(" ")}
              >
                <View className="flex-row items-center">
                  <MethodIcon method={option.key} />
                  <Text className="ml-2 text-text-primary text-sm font-semibold">
                    {option.title}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setMakeDefault((prev) => !prev)}
          className="mt-2 flex-row items-center rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3 active:opacity-90"
        >
          <View
            className={[
              "h-5 w-5 rounded border items-center justify-center",
              makeDefault ? "border-brand-primary bg-brand-primary" : "border-border-default bg-bg-elevated",
            ].join(" ")}
          >
            {makeDefault ? <Text className="text-text-inverse text-xs">✓</Text> : null}
          </View>
          <Text className="ml-3 text-text-primary text-sm font-medium">
            {t.dreamInterpretMethod.makeDefault}
          </Text>
        </Pressable>

        <Pressable
          onPress={onInterpret}
          disabled={!canInterpret}
          className={[
            "mt-4 rounded-full px-6 py-4 flex-row items-center justify-center gap-2",
            canInterpret ? "bg-brand-primary active:opacity-90" : "bg-border-default opacity-70",
          ].join(" ")}
        >
          {isInterpreting ? <ActivityIndicator /> : null}
          <Text className="text-text-inverse text-base font-semibold">
            {t.dreamInterpretMethod.interpretCta}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
