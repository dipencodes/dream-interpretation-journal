import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import {
  getDreamLoggedDateKey,
  getDreams,
  toLocalDateKey,
  type DreamRecord,
} from "../services/dreamStorage";
import { getPreferredName, setPreferredName } from "../services/userProfile";
import { t } from "../i18n";
import { BottomTabDock } from "../components/BottomTabDock";
import {
  getMoodOptionById,
  getMoodOptionByTitle,
  POSITIVE_MOOD_IDS,
} from "../constants/moods";
import { getNotificationPreferences } from "../services/notificationPreferences";
import {
  getHomeDreamPromptDismissedDate,
  setHomeDreamPromptDismissedDate,
} from "../services/appPreferences";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;
type StatsWindowDays = 7 | 30 | 90;

const STATS_WINDOWS: StatsWindowDays[] = [7, 30, 90];

function truncate(text: string, max = 120) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function RecentDreamCard({
  dream,
  onPress,
}: {
  dream: DreamRecord;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-3 rounded-3xl border border-border-subtle bg-bg-surface p-5 active:opacity-90"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-text-primary text-sm font-semibold">{dream.dreamDate}</Text>
        <Text className="text-brand-copper text-lg">›</Text>
      </View>
      <Text className="text-text-secondary mt-3 text-[15px] leading-6">
        {truncate(dream.dreamText)}
      </Text>
    </Pressable>
  );
}

function RecommendationCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-3 rounded-1xl border border-border-subtle bg-bg-surface p-5 active:opacity-90"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-text-primary text-1xl font-semibold">
            {t.home.recommendationCardTitle}
          </Text>
          <Text className="text-text-secondary mt-3 text-[15px] leading-7">
            {t.home.recommendationCardSubtitle}
          </Text>
        </View>
        <Text className="text-brand-copper text-2xl">›</Text>
      </View>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [allDreams, setAllDreams] = useState<DreamRecord[]>([]);
  const [recentDreams, setRecentDreams] = useState<DreamRecord[]>([]);
  const [preferredName, setPreferredNameState] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [statsWindowDays, setStatsWindowDays] = useState<StatsWindowDays>(7);
  const [isMorningNotificationEnabled, setIsMorningNotificationEnabled] = useState(false);
  const [dreamPromptDismissedDateKey, setDreamPromptDismissedDateKey] = useState<string | null>(
    null
  );

  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return t.home.greetingMorning;
    if (hour < 18) return t.home.greetingAfternoon;
    return t.home.greetingEvening;
  }

  const loadHomeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dreams, name, notificationPreferences, dismissedDateKey] = await Promise.all([
        getDreams(),
        getPreferredName(),
        getNotificationPreferences(),
        getHomeDreamPromptDismissedDate(),
      ]);
      setAllDreams(dreams);
      setRecentDreams(dreams.slice(0, 1));
      setPreferredNameState(name);
      setNameInput(name ?? "");
      setIsMorningNotificationEnabled(notificationPreferences.morningEnabled);
      setDreamPromptDismissedDateKey(dismissedDateKey);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onNameBlur = async () => {
    if (isSavingName) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      if (preferredName) {
        setNameInput(preferredName);
        setIsEditingName(false);
      }
      return;
    }
    if (trimmed === preferredName) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsSavingName(true);
      await setPreferredName(trimmed);
      setPreferredNameState(trimmed);
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const cutoff = now - statsWindowDays * 24 * 60 * 60 * 1000;

    const dreamsInWindow = allDreams.filter((dream) => {
      const createdAt = Number(dream.createdAt);
      if (Number.isFinite(createdAt) && createdAt > 0) {
        return createdAt >= cutoff;
      }
      const parsedDate = Date.parse(dream.dreamDate);
      return Number.isNaN(parsedDate) ? false : parsedDate >= cutoff;
    });

    let positiveCount = 0;
    let negativeCount = 0;

    dreamsInWindow.forEach((dream) => {
      const moodId =
        getMoodOptionById(dream.moodIcon)?.id ??
        getMoodOptionByTitle(dream.moodLabel)?.id;
      if (!moodId) return;
      if (POSITIVE_MOOD_IDS.has(moodId)) {
        positiveCount += 1;
      } else {
        negativeCount += 1;
      }
    });

    const totalWithMood = positiveCount + negativeCount;
    const positivePercent = totalWithMood > 0 ? (positiveCount / totalWithMood) * 100 : 0;

    return {
      positiveCount,
      negativeCount,
      totalWithMood,
      positivePercent,
    };
  }, [allDreams, statsWindowDays]);

  const todayDateKey = useMemo(() => toLocalDateKey(new Date()), []);
  const isTodayDreamPromptDismissed = dreamPromptDismissedDateKey === todayDateKey;
  const hasDreamToday = useMemo(
    () => allDreams.some((dream) => getDreamLoggedDateKey(dream) === todayDateKey),
    [allDreams, todayDateKey]
  );
  const showTodayDreamPrompt = !isLoading && !hasDreamToday && !isTodayDreamPromptDismissed;

  const onDismissTodayDreamPrompt = async () => {
    await setHomeDreamPromptDismissedDate(todayDateKey);
    setDreamPromptDismissedDateKey(todayDateKey);
  };

  return (
    <View className="flex-1 bg-bg-base">
      <View pointerEvents="none" className="absolute inset-0">
        <View
          style={{
            position: "absolute",
            top: -180,
            left: -120,
            width: 340,
            height: 340,
            borderRadius: 9999,
            backgroundColor: "#F28C28",
            opacity: 0.12,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 160,
            right: -120,
            width: 320,
            height: 320,
            borderRadius: 9999,
            backgroundColor: "#FFD6A8",
            opacity: 0.18,
          }}
        />
      </View>

      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-[34px] border border-border-subtle bg-bg-surface p-6"
          style={{
            shadowColor: "#D97706",
            shadowOpacity: 0.12,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 10 },
            elevation: 7,
          }}
        >
          <Text className="text-text-secondary text-base font-semibold">
            {getTimeGreeting()}
          </Text>

          {isEditingName || !preferredName ? (
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              onBlur={onNameBlur}
              onSubmitEditing={onNameBlur}
              autoFocus
              placeholder={t.home.namePlaceholder}
              placeholderTextColor="#8B8B8B"
              className="mt-3 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3 text-3xl font-semibold text-text-primary"
            />
          ) : (
            <Pressable
              onPress={() => setIsEditingName(true)}
              className="mt-2 rounded-2xl py-1 active:opacity-90"
            >
              <Text className="text-text-primary text-4xl font-semibold">
                {preferredName}
              </Text>
            </Pressable>
          )}

          {isSavingName ? (
            <View className="mt-3">
              <ActivityIndicator />
            </View>
          ) : null}
        </View>

        {showTodayDreamPrompt ? (
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
            <Text className="text-text-primary text-xl font-semibold">
              {t.home.todayDreamPromptTitle}
            </Text>

            <View className="mt-4 flex-row items-center gap-3">
              <Pressable
                onPress={() => navigation.navigate("DreamInput")}
                className="rounded-full bg-brand-primary px-5 py-2.5 active:opacity-90"
              >
                <Text className="text-text-inverse text-sm font-semibold">
                  {t.home.todayDreamPromptAddCta}
                </Text>
              </Pressable>

              <Pressable
                onPress={onDismissTodayDreamPrompt}
                className="rounded-full border border-border-default bg-bg-elevated px-5 py-2.5 active:opacity-90"
              >
                <Text className="text-text-secondary text-sm font-semibold">
                  {t.home.todayDreamPromptDismissCta}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View className="mt-8 flex-row items-center justify-between">
          <Text className="text-text-primary text-3xl font-semibold">
            {t.home.quickStatsTitle}
          </Text>
          <View className="rounded-full border border-border-subtle bg-bg-surface p-1">
            <View className="flex-row">
              {STATS_WINDOWS.map((windowDays) => {
                const active = windowDays === statsWindowDays;
                return (
                  <Pressable
                    key={windowDays}
                    onPress={() => setStatsWindowDays(windowDays)}
                    className={[
                      "rounded-full px-4 py-2",
                      active ? "bg-brand-primary" : "bg-transparent",
                    ].join(" ")}
                  >
                    <Text
                      className={
                        active
                          ? "text-text-inverse text-sm font-semibold"
                          : "text-text-secondary text-sm font-semibold"
                      }
                    >
                      {windowDays}D
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View
          className="mt-3 rounded-3xl border border-border-subtle bg-bg-surface p-5"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View className="h-2 overflow-hidden rounded-full bg-bg-elevated">
            <View
              className="h-2 rounded-full bg-brand-primary"
              style={{ width: `${Math.max(8, stats.positivePercent)}%` }}
            />
          </View>

          <View className="mt-4 flex-row items-center">
            <View className="flex-1">
              <Text className="text-text-secondary text-sm font-semibold">
                {t.home.positiveDreamsLabel}
              </Text>
              <Text className="text-text-primary mt-2 text-4xl font-semibold">
                {stats.positiveCount}
              </Text>
            </View>

            <View className="h-16 w-px bg-border-subtle" />

            <View className="flex-1 pl-5">
              <Text className="text-text-secondary text-sm font-semibold">
                {t.home.negativeDreamsLabel}
              </Text>
              <Text className="text-text-primary mt-2 text-4xl font-semibold">
                {stats.negativeCount}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-center gap-3">
          <Pressable
            onPress={() => navigation.navigate("DreamInput")}
            className="rounded-2xl bg-brand-primary px-6 py-3.5 active:opacity-90"
          >
            <Text className="text-text-inverse text-base font-semibold">
              {t.home.quickStatsAddDreamCta}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Journal")}
            className="rounded-2xl border border-border-subtle bg-bg-surface px-6 py-3.5 active:opacity-90"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 7 },
              elevation: 2,
            }}
          >
            <Text className="text-text-primary text-base font-semibold">
              {t.home.quickStatsSeeMoreCta} ›
            </Text>
          </Pressable>
        </View>

        <View className="mt-8 flex-row items-center justify-between">
          <Text className="text-text-primary text-3xl font-semibold">
            {t.home.recentSectionTitle}
          </Text>
          <Pressable onPress={() => navigation.navigate("Journal")} className="active:opacity-90">
            <Text className="text-brand-copper text-sm font-semibold">
              {t.home.viewAllDreamsCta}
            </Text>
          </Pressable>
        </View>

        <View className="mt-1">
          <Text className="text-text-secondary text-sm">
            {t.home.recentSectionSubtext}
          </Text>
        </View>

        {isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator />
          </View>
        ) : null}

        {!isLoading && recentDreams.length === 0 ? (
          <View className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4">
            <Text className="text-text-secondary text-[15px] leading-6">
              {t.home.emptyRecent}
            </Text>
          </View>
        ) : null}

        {!isLoading &&
          recentDreams.map((dream) => (
            <RecentDreamCard
              key={dream.id}
              dream={dream}
              onPress={() => navigation.navigate("DreamSummary", { dream })}
            />
          ))}

        <View
          className="mt-6 rounded-3xl border border-border-subtle bg-bg-surface p-5"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-text-primary text-xl font-semibold">
                {t.home.playgroundSectionTitle}
              </Text>
              <Text className="text-text-secondary mt-2 text-[15px] leading-6">
                {t.home.playgroundSectionSubtext}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate("Playground")}
              className="rounded-full bg-brand-primary px-5 py-2.5 active:opacity-90"
            >
              <Text className="text-text-inverse text-sm font-semibold">
                {t.home.openPlaygroundCta}
              </Text>
            </Pressable>
          </View>
        </View>

        {!isMorningNotificationEnabled ? (
          <>
            <View className="mt-8 flex-row items-center">
              <Text className="text-text-primary text-3xl font-semibold">
                {t.home.recommendationTitle}
              </Text>
            </View>
            <RecommendationCard
              onPress={() => navigation.navigate("NotificationSettings")}
            />
          </>
        ) : null}

      </ScrollView>

      <BottomTabDock
        activeTab="home"
        onHomePress={() => {}}
        onJournalPress={() => navigation.navigate("Journal")}
        onPlaygroundPress={() => navigation.navigate("Playground")}
        onSettingsPress={() => navigation.navigate("Settings")}
      />
    </View>
  );
}
