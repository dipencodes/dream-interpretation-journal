import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import type { RootStackParamList } from "../navigation/types";
import { t } from "../i18n";
import { saveDream, type DreamRecord } from "../services/dreamStorage";
import { savePlaygroundDream } from "../services/playgroundStorage";
import { ensureAnonymousAuth } from "../services/auth";
import {
  getDefaultInterpretMethod,
  type InterpretMethodKey,
} from "../services/appPreferences";
import { canRunAiInterpretation, consumeFreeUseIfNeeded } from "../services/paywallGate";
import { refreshMorningReminderSchedule } from "../services/notifications";
import {
  normalizeTrackingErrorCode,
  trackInterpretationFailed,
  trackInterpretationStarted,
  trackInterpretationSucceeded,
} from "../services/tracking";
import { MoodIcon } from "../components/MoodIcon";
import { MOOD_OPTIONS, type MoodId } from "../constants/moods";

type Props = NativeStackScreenProps<RootStackParamList, "DreamMood">;

function Dots({ activeIndex = 2, total = 3 }: { activeIndex?: number; total?: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === activeIndex;
        return (
          <View
            key={i}
            className={[
              "h-2 rounded-full",
              active ? "w-10 bg-brand-primary" : "w-2 bg-border-default",
            ].join(" ")}
          />
        );
      })}
    </View>
  );
}

export function DreamMoodScreen({ route, navigation }: Props) {
  const { dreamDate, dreamText, context = "journal" } = route.params;
  const [selectedMoodId, setSelectedMoodId] = useState<MoodId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningAi, setIsRunningAi] = useState(false);

  const selectedMood = useMemo(
    () => MOOD_OPTIONS.find((mood) => mood.id === selectedMoodId) ?? null,
    [selectedMoodId]
  );

  const buildBaseRecord = (): DreamRecord => ({
    id: Date.now().toString(),
    createdAt: Date.now(),
    dreamDate,
    dreamText,
    interpretationSummary: null,
    interpretation: null,
    warning: null,
    sourceKey: "manual",
    moodLabel: selectedMood?.title ?? undefined,
    moodIcon: selectedMood?.id ?? undefined,
  });

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

  const runInterpretation = async (method: InterpretMethodKey, gateUid: string) => {
    await trackInterpretationStarted({ method, source_screen: "dream_mood" });

    try {
      await ensureAnonymousAuth();

      const functionsInstance = getFunctions(getApp());
      const callable = httpsCallable(functionsInstance, "interpretDream");
      const result = await callable({
        dreamText,
        dreamDate,
        sourceKey: method,
      });

      const data = result.data as {
        summary?: string | null;
        interpretation: string;
        warning: string | null;
      };
      const record: DreamRecord = {
        ...buildBaseRecord(),
        sourceKey: method,
        interpretationSummary: data.summary ?? null,
        interpretation: data.interpretation,
        warning: data.warning ?? null,
        interpretations: {
          [method]: {
            summary: data.summary ?? null,
            interpretation: data.interpretation,
            warning: data.warning ?? null,
          },
        },
      };

      await persistDream(record);
      await trackInterpretationSucceeded({ method, source_screen: "dream_mood" });
      await consumeFreeUseIfNeeded(gateUid);
      navigation.navigate("DreamSummary", { dream: record, context });
    } catch (error: unknown) {
      await trackInterpretationFailed({
        method,
        source_screen: "dream_mood",
        error_code: normalizeTrackingErrorCode(error),
      });
      throw error;
    }
  };

  const onSaveOnly = async () => {
    if (!selectedMood || isSaving || isRunningAi) return;
    try {
      setIsSaving(true);
      const record = buildBaseRecord();
      await persistDream(record);
      navigation.navigate("DreamSummary", { dream: record, context });
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? t.dreamMood.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveAndInterpret = async () => {
    if (!selectedMood || isSaving || isRunningAi) return;
    try {
      const gate = await canRunAiInterpretation();
      if (!gate.allowed) {
        navigation.navigate("Paywall");
        return;
      }

      const defaultMethod = await getDefaultInterpretMethod();
      if (!defaultMethod) {
        navigation.navigate("DreamInterpretMethod", {
          dreamText,
          dreamDate,
          moodLabel: selectedMood.title,
          moodIcon: selectedMood.id,
          selectedMoodId: selectedMood.id,
          context,
        });
        return;
      }
      setIsRunningAi(true);
      await runInterpretation(defaultMethod, gate.uid);
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? t.dreamMood.interpretError);
    } finally {
      setIsRunningAi(false);
    }
  };

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
        <View
          style={{
            position: "absolute",
            top: 100,
            right: -100,
            width: 260,
            height: 260,
            borderRadius: 9999,
            backgroundColor: "#FFD6A8",
            opacity: 0.16,
          }}
        />
      </View>

      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 34 }}
        showsVerticalScrollIndicator={false}
      >
        <Dots />

        <View className="mt-5">
          <Text className="text-text-primary text-center text-3xl font-semibold">
            {t.dreamMood.title}
          </Text>
          <Text className="text-text-secondary mt-2 text-center text-[15px] leading-6">
            {t.dreamMood.subtitle}
          </Text>
        </View>

        <View className="mt-6 flex-row flex-wrap justify-between">
          {MOOD_OPTIONS.map((mood) => {
            const selected = selectedMoodId === mood.id;
            return (
              <Pressable
                key={mood.id}
                onPress={() => setSelectedMoodId(mood.id)}
                className={[
                  "mb-3 w-[48%] rounded-3xl border bg-bg-surface p-4 active:opacity-90",
                  selected ? "border-brand-primary" : "border-border-subtle",
                ].join(" ")}
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center">
                  <MoodIcon id={mood.id} />
                  <Text className="text-text-primary ml-2 flex-1 text-sm font-semibold">
                    {mood.title}
                  </Text>
                </View>
                <Text
                  className="text-text-secondary mt-2 text-xs leading-4"
                  numberOfLines={2}
                >
                  {mood.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-3">
          <Pressable
            onPress={onSaveOnly}
            disabled={!selectedMood || isSaving || isRunningAi}
            className={[
              "rounded-full px-6 py-4 flex-row items-center justify-center gap-2",
              selectedMood && !isSaving && !isRunningAi
                ? "bg-brand-primary active:opacity-90"
                : "bg-border-default opacity-70",
            ].join(" ")}
          >
            {isSaving ? <ActivityIndicator /> : null}
            <Text className="text-text-inverse text-center text-base font-semibold">
              {t.dreamMood.saveCta}
            </Text>
          </Pressable>

          <Pressable
            onPress={onSaveAndInterpret}
            disabled={!selectedMood || isSaving || isRunningAi}
            className={[
              "mt-3 rounded-full px-6 py-4 flex-row items-center justify-center gap-2",
              selectedMood && !isSaving && !isRunningAi
                ? "bg-bg-surface border border-border-default active:opacity-90"
                : "bg-border-default opacity-70",
            ].join(" ")}
          >
            {isRunningAi ? <ActivityIndicator /> : null}
            <Text className="text-text-primary text-center text-base font-semibold">
              {t.dreamMood.saveAndInterpretCta}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
