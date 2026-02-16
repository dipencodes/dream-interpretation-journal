import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import type { RootStackParamList } from "../navigation/types";
import { t } from "../i18n";
import { ensureAnonymousAuth } from "../services/auth";
import {
  upsertDream,
  type DreamRecord,
  type MethodInterpretation,
} from "../services/dreamStorage";
import type { InterpretMethodKey } from "../services/appPreferences";
import { canRunAiInterpretation, consumeFreeUseIfNeeded } from "../services/paywallGate";
import { MoodIcon } from "../components/MoodIcon";
import { getMoodOptionById, getMoodOptionByTitle } from "../constants/moods";
import {
  normalizeTrackingErrorCode,
  trackInterpretationFailed,
  trackInterpretationStarted,
  trackInterpretationSucceeded,
} from "../services/tracking";

type Props = NativeStackScreenProps<RootStackParamList, "DreamSummary">;

const METHOD_LABELS: Record<InterpretMethodKey, string> = {
  hindu: "Hinduism",
  buddhist: "Buddhism",
  christian: "Christianity",
  islamic: "Islam",
  scientific: "Scientific",
};

const ALL_METHODS: InterpretMethodKey[] = [
  "hindu",
  "buddhist",
  "christian",
  "islamic",
  "scientific",
];

function getExcerpt(text: string, max = 220) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function normalizeInterpretationText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildQuickTake(text: string) {
  const normalized = normalizeInterpretationText(text);
  if (!normalized) return "";

  const sentences = splitIntoSentences(normalized);
  if (sentences.length === 0) return normalized;

  const quickSentences: string[] = [];
  let chars = 0;

  for (const sentence of sentences) {
    if (quickSentences.length >= 2) break;
    if (chars + sentence.length > 240 && quickSentences.length > 0) break;
    quickSentences.push(sentence);
    chars += sentence.length;
  }

  return quickSentences.join(" ");
}

function buildReadableParagraphs(text: string) {
  const normalized = normalizeInterpretationText(text);
  if (!normalized) return [];

  const sentences = splitIntoSentences(normalized);
  if (sentences.length <= 1) return [normalized];

  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push(sentences.slice(index, index + 2).join(" "));
  }
  return paragraphs;
}

function getNormalizedInterpretations(dream: DreamRecord) {
  const map: Partial<Record<InterpretMethodKey, MethodInterpretation>> = {
    ...(dream.interpretations ?? {}),
  };
  if (
    dream.sourceKey &&
    dream.sourceKey in METHOD_LABELS &&
    dream.interpretation &&
    !map[dream.sourceKey as InterpretMethodKey]
  ) {
    map[dream.sourceKey as InterpretMethodKey] = {
      summary: dream.interpretationSummary ?? null,
      interpretation: dream.interpretation,
      warning: dream.warning ?? null,
    };
  }
  return map;
}

export function DreamSummaryScreen({ route, navigation }: Props) {
  const [dream, setDream] = useState<DreamRecord>(route.params.dream);
  const [dreamDraft, setDreamDraft] = useState(route.params.dream.dreamText);
  const [isEditingDream, setIsEditingDream] = useState(false);
  const [isSavingDream, setIsSavingDream] = useState(false);
  const [regeneratedMethods, setRegeneratedMethods] = useState<Set<InterpretMethodKey>>(
    new Set()
  );
  const [expandedDream, setExpandedDream] = useState(false);
  const [expandedInterpretation, setExpandedInterpretation] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<InterpretMethodKey | null>(null);
  const [isInterpretingMethod, setIsInterpretingMethod] = useState<InterpretMethodKey | null>(null);

  const interpretationsMap = useMemo(() => getNormalizedInterpretations(dream), [dream]);

  const interpretedMethodsList = useMemo(
    () => ALL_METHODS.filter((method) => Boolean(interpretationsMap[method])),
    [interpretationsMap]
  );
  const hasAnyInterpretation = interpretedMethodsList.length > 0;

  const effectiveMethod = useMemo(() => {
    if (currentMethod && interpretationsMap[currentMethod]) return currentMethod;
    if (
      dream.sourceKey &&
      dream.sourceKey in METHOD_LABELS &&
      interpretationsMap[dream.sourceKey as InterpretMethodKey]
    ) {
      return dream.sourceKey as InterpretMethodKey;
    }
    return interpretedMethodsList[0] ?? null;
  }, [currentMethod, dream.sourceKey, interpretedMethodsList, interpretationsMap]);

  const currentInterpretation: MethodInterpretation | null = useMemo(() => {
    if (effectiveMethod && interpretationsMap[effectiveMethod]) {
      return interpretationsMap[effectiveMethod] ?? null;
    }
    return null;
  }, [effectiveMethod, interpretationsMap]);

  const normalizedInterpretationText = useMemo(
    () => normalizeInterpretationText(currentInterpretation?.interpretation ?? ""),
    [currentInterpretation]
  );

  const interpretationQuickTake = useMemo(() => {
    if (!currentInterpretation) return "";
    const summary = currentInterpretation.summary?.trim();
    if (summary) return summary;
    return buildQuickTake(currentInterpretation.interpretation);
  }, [currentInterpretation]);

  const interpretationParagraphs = useMemo(
    () => buildReadableParagraphs(currentInterpretation?.interpretation ?? ""),
    [currentInterpretation]
  );

  const interpretationPreview = useMemo(
    () => getExcerpt(normalizedInterpretationText),
    [normalizedInterpretationText]
  );

  const interpretedMethods = useMemo(() => {
    const methods = new Set<InterpretMethodKey>();
    Object.keys(interpretationsMap).forEach((key) => {
      if (key in METHOD_LABELS) {
        methods.add(key as InterpretMethodKey);
      }
    });
    return methods;
  }, [interpretationsMap]);

  const remainingMethods = useMemo(
    () => ALL_METHODS.filter((method) => !interpretedMethods.has(method)),
    [interpretedMethods]
  );
  const selectedMood = useMemo(() => {
    const fromId = getMoodOptionById(dream.moodIcon);
    if (fromId) return fromId;
    return getMoodOptionByTitle(dream.moodLabel);
  }, [dream.moodIcon, dream.moodLabel]);

  const onGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  const onStartEditingDream = () => {
    setDreamDraft(dream.dreamText);
    setIsEditingDream(true);
  };

  const onDoneEditingDream = async () => {
    if (!isEditingDream || isSavingDream) return;
    const trimmed = dreamDraft.trim();
    if (!trimmed) {
      Alert.alert("Error", "Dream text cannot be empty.");
      return;
    }
    if (trimmed === dream.dreamText) {
      setIsEditingDream(false);
      return;
    }

    try {
      setIsSavingDream(true);
      const updatedDream: DreamRecord = {
        ...dream,
        dreamText: trimmed,
      };
      await upsertDream(updatedDream);
      setDream(updatedDream);
      setExpandedDream(false);
      setIsEditingDream(false);
      setRegeneratedMethods(new Set());
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Could not save dream text.");
    } finally {
      setIsSavingDream(false);
    }
  };

  const onInterpretWithMethod = async (
    method: InterpretMethodKey,
    options?: { markRegenerated?: boolean }
  ) => {
    if (isInterpretingMethod) return;
    let didStartInterpretation = false;
    try {
      const gate = await canRunAiInterpretation();
      if (!gate.allowed) {
        navigation.navigate("Paywall");
        return;
      }

      setIsInterpretingMethod(method);
      await ensureAnonymousAuth();
      await trackInterpretationStarted({
        method,
        source_screen: "dream_summary",
      });
      didStartInterpretation = true;

      const functionsInstance = getFunctions(getApp());
      const callable = httpsCallable(functionsInstance, "interpretDream");
      const result = await callable({
        dreamText: dream.dreamText,
        dreamDate: dream.dreamDate,
        sourceKey: method,
      });
      const data = result.data as {
        summary?: string | null;
        interpretation: string;
        warning: string | null;
      };

      const updatedDream: DreamRecord = {
        ...dream,
        sourceKey: method,
        interpretationSummary: data.summary ?? null,
        interpretation: data.interpretation,
        warning: data.warning ?? null,
        interpretations: {
          ...interpretationsMap,
          [method]: {
            summary: data.summary ?? null,
            interpretation: data.interpretation,
            warning: data.warning ?? null,
          },
        },
      };

      await upsertDream(updatedDream);
      await trackInterpretationSucceeded({
        method,
        source_screen: "dream_summary",
      });
      await consumeFreeUseIfNeeded(gate.uid);
      setDream(updatedDream);
      setCurrentMethod(method);
      setExpandedInterpretation(false);
      if (options?.markRegenerated) {
        setRegeneratedMethods((prev) => {
          const next = new Set(prev);
          next.add(method);
          return next;
        });
      }
    } catch (error: unknown) {
      if (didStartInterpretation) {
        await trackInterpretationFailed({
          method,
          source_screen: "dream_summary",
          error_code: normalizeTrackingErrorCode(error),
        });
      }
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Could not interpret with this method.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsInterpretingMethod(null);
    }
  };

  return (
    <View className="flex-1 bg-bg-base">
      <View pointerEvents="none" className="absolute inset-0">
        <View
          style={{
            position: "absolute",
            top: -120,
            left: -90,
            width: 270,
            height: 270,
            borderRadius: 9999,
            backgroundColor: "#F28C28",
            opacity: 0.11,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 110,
            right: -110,
            width: 270,
            height: 270,
            borderRadius: 9999,
            backgroundColor: "#9CC7FF",
            opacity: 0.14,
          }}
        />
      </View>

      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 26 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row">
          <Pressable
            onPress={onGoHome}
            className="h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-bg-surface active:opacity-90"
          >
            <Text className="text-text-primary text-xl">⌂</Text>
          </Pressable>
        </View>

        <View className="items-center">
          <Text className="text-text-primary text-center text-3xl font-semibold">
            {t.dreamSummary.title}
          </Text>
          <Text className="text-text-secondary mt-2 text-center text-[15px] leading-6">
            {t.dreamSummary.subtitle}
          </Text>
        </View>

        <View
          className="mt-5 rounded-3xl border border-border-subtle bg-bg-surface p-4"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View className="flex-row items-center">
            <Text className="text-text-primary pr-2 text-base font-semibold">
              {t.dreamSummary.yourDream}
            </Text>
            <View className="ml-auto flex-row items-center">
              <View className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1">
                <Text className="text-text-secondary text-xs font-semibold">{dream.dreamDate}</Text>
              </View>
              {selectedMood ? (
                <View className="ml-2 flex-row items-center rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 max-w-[56%]">
                  <MoodIcon id={selectedMood.id} size={16} />
                  <Text
                    numberOfLines={1}
                    className="text-text-secondary ml-2 text-xs font-semibold"
                  >
                    {selectedMood.title}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View className="mt-2.5 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3">
            {isEditingDream ? (
              <>
                <TextInput
                  value={dreamDraft}
                  onChangeText={setDreamDraft}
                  onSubmitEditing={onDoneEditingDream}
                  onEndEditing={onDoneEditingDream}
                  multiline
                  blurOnSubmit
                  returnKeyType="done"
                  textAlignVertical="top"
                  className="min-h-[120px] text-text-secondary text-[15px] leading-6"
                />
                {isSavingDream ? (
                  <View className="mt-3 self-start">
                    <ActivityIndicator />
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Pressable onPress={onStartEditingDream} className="active:opacity-90">
                  <Text className="text-text-secondary text-[15px] leading-6">
                    {expandedDream ? dream.dreamText : getExcerpt(dream.dreamText, 160)}
                  </Text>
                </Pressable>
                {dream.dreamText.length > 160 ? (
                  <Pressable
                    onPress={() => setExpandedDream((prev) => !prev)}
                    className="mt-3 self-start"
                  >
                    <Text className="text-brand-copper text-sm font-semibold">
                      {expandedDream ? "See less" : "See more"}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View
          className="mt-5 rounded-3xl border border-border-subtle bg-bg-surface p-5"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary text-base font-semibold">
              {t.dreamSummary.interpretation}
            </Text>
            {effectiveMethod ? (
              <View className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1">
                <Text className="text-text-secondary text-xs font-semibold">
                  {METHOD_LABELS[effectiveMethod]}
                </Text>
              </View>
            ) : null}
          </View>

          {currentInterpretation?.warning ? (
            <View className="mt-3 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3">
              <Text className="text-yellow-800 text-sm leading-5">
                {currentInterpretation.warning}
              </Text>
            </View>
          ) : null}

          {interpretedMethodsList.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {interpretedMethodsList.map((method) => {
                const selected = method === effectiveMethod;
                return (
                  <Pressable
                    key={method}
                    onPress={() => {
                      setCurrentMethod(method);
                      setExpandedInterpretation(false);
                    }}
                    className={[
                      "mr-2 rounded-full border px-4 py-2",
                      selected
                        ? "border-brand-primary bg-brand-primary"
                        : "border-border-default bg-bg-surface",
                    ].join(" ")}
                  >
                    <Text
                      className={
                        selected
                          ? "text-text-inverse text-sm font-semibold"
                          : "text-text-primary text-sm font-semibold"
                      }
                    >
                      {METHOD_LABELS[method]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {currentInterpretation ? (
            <>
              <View className="mt-3 rounded-2xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-3">
                <Text className="text-text-primary text-[11px] font-semibold uppercase tracking-[0.8px]">
                  {t.dreamSummary.quickTakeTitle}
                </Text>
                <Text className="text-text-primary mt-1 text-[15px] leading-6 font-medium">
                  {interpretationQuickTake}
                </Text>
              </View>

              <View className="mt-3 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3">
                <Text className="text-text-primary text-[11px] font-semibold uppercase tracking-[0.8px]">
                  {t.dreamSummary.detailsTitle}
                </Text>

                <View className="mt-2">
                  {expandedInterpretation
                    ? interpretationParagraphs.map((paragraph, index) => (
                        <Text
                          key={`${index}-${paragraph.slice(0, 18)}`}
                          className={[
                            "text-text-secondary text-[15px] leading-6",
                            index === 0 ? "" : "mt-2",
                          ].join(" ")}
                        >
                          {paragraph}
                        </Text>
                      ))
                    : (
                        <Text className="text-text-secondary text-[15px] leading-6">
                          {interpretationPreview}
                        </Text>
                      )}
                </View>

                <View className="mt-3 flex-row items-center">
                  {normalizedInterpretationText.length > 220 ? (
                    <Pressable onPress={() => setExpandedInterpretation((prev) => !prev)}>
                      <Text className="text-brand-copper text-sm font-semibold">
                        {expandedInterpretation
                          ? t.dreamSummary.readLessCta
                          : t.dreamSummary.readMoreCta}
                      </Text>
                    </Pressable>
                  ) : null}

                  {effectiveMethod && !regeneratedMethods.has(effectiveMethod) ? (
                    <Pressable
                      onPress={() =>
                        onInterpretWithMethod(effectiveMethod, { markRegenerated: true })
                      }
                      disabled={Boolean(isInterpretingMethod)}
                      className="ml-auto"
                    >
                      <Text className="text-brand-copper text-sm font-semibold">
                        {isInterpretingMethod === effectiveMethod ? "Regenerating..." : "Regenerate"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </>
          ) : (
            <View className="mt-3 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3">
              <Text className="text-text-secondary text-[15px] leading-6">
                {t.dreamSummary.noInterpretation}
              </Text>
            </View>
          )}

          {remainingMethods.length > 0 ? (
            <View className="mt-4">
              {hasAnyInterpretation ? (
                <Text className="text-text-primary text-sm font-semibold">
                  {t.dreamSummary.interpretOthers}
                </Text>
              ) : null}
              <View className={[hasAnyInterpretation ? "mt-3" : "", "flex-row flex-wrap"].join(" ")}>
                {remainingMethods.map((method) => (
                  <Pressable
                    key={method}
                    onPress={() => onInterpretWithMethod(method)}
                    disabled={Boolean(isInterpretingMethod)}
                    className={[
                      "mr-2 mb-2 rounded-full border px-4 py-2",
                      isInterpretingMethod === method
                        ? "border-brand-primary bg-brand-primary"
                        : "border-border-default bg-bg-surface",
                    ].join(" ")}
                  >
                    <Text
                      className={
                        isInterpretingMethod === method
                          ? "text-text-inverse text-sm font-semibold"
                          : "text-text-primary text-sm font-semibold"
                      }
                    >
                      {isInterpretingMethod === method ? "Interpreting..." : METHOD_LABELS[method]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {isInterpretingMethod ? (
                <View className="mt-2">
                  <ActivityIndicator />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
