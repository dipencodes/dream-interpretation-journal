import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar, type DateData } from "react-native-calendars";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { type DreamRecord } from "../services/dreamStorage";
import {
  deletePlaygroundDream,
  getPlaygroundDreams,
} from "../services/playgroundStorage";
import { t } from "../i18n";
import { BottomTabDock } from "../components/BottomTabDock";

type Props = NativeStackScreenProps<RootStackParamList, "Playground">;
type ViewMode = "list" | "calendar";

type MarkedDateEntry = {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
};

const PAGE_SIZE = 10;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toDateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKeyFromDream(dream: DreamRecord): string | null {
  const createdAt = Number(dream.createdAt);
  if (Number.isFinite(createdAt) && createdAt > 0) {
    const createdDate = new Date(createdAt);
    if (!Number.isNaN(createdDate.getTime())) {
      return toDateKeyFromDate(createdDate);
    }
  }

  const parsed = Date.parse(dream.dreamDate);
  if (!Number.isNaN(parsed)) {
    return toDateKeyFromDate(new Date(parsed));
  }

  return null;
}

function dateKeyToDate(dateKey: string): Date | null {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function buildMarkedDates(
  dreams: DreamRecord[],
  selectedDateKey: string
): Record<string, MarkedDateEntry> {
  const markedDates: Record<string, MarkedDateEntry> = {};

  dreams.forEach((dream) => {
    const dateKey = toDateKeyFromDream(dream);
    if (!dateKey) return;
    markedDates[dateKey] = {
      ...(markedDates[dateKey] ?? {}),
      marked: true,
      dotColor: "#D97706",
    };
  });

  markedDates[selectedDateKey] = {
    ...(markedDates[selectedDateKey] ?? {}),
    selected: true,
    selectedColor: "#D97706",
    selectedTextColor: "#FFFFFF",
    marked: Boolean(markedDates[selectedDateKey]?.marked),
    dotColor: markedDates[selectedDateKey]?.marked ? "#FFFFFF" : undefined,
  };

  return markedDates;
}

function buildYearRange(dreams: DreamRecord[]): number[] {
  const currentYear = new Date().getFullYear();
  const dreamYears = dreams
    .map((dream) => toDateKeyFromDream(dream))
    .filter((value): value is string => Boolean(value))
    .map((dateKey) => Number(dateKey.slice(0, 4)))
    .filter((year) => Number.isInteger(year));

  const minYear = dreamYears.length > 0 ? Math.min(...dreamYears) : currentYear - 5;
  const maxYear = currentYear + 2;

  const years: number[] = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    years.push(year);
  }

  return years;
}

function PlaygroundDreamListItem({
  dream,
  onPress,
  onDelete,
}: {
  dream: DreamRecord;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      className="mt-3 rounded-3xl border border-border-subtle bg-bg-surface p-5"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-text-secondary text-sm">{dream.dreamDate}</Text>
        <Pressable
          onPress={onDelete}
          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 active:opacity-90"
        >
          <Text className="text-red-600 text-xs font-semibold">
            {t.playground.deleteCta}
          </Text>
        </Pressable>
      </View>

      <Pressable onPress={onPress} className="active:opacity-90">
        <Text className="text-text-primary mt-2 text-base font-semibold">
          {dream.dreamText.slice(0, 90)}
        </Text>
        <Text className="text-text-secondary mt-2 text-sm">
          {dream.interpretation?.slice(0, 100) ?? ""}
        </Text>
      </Pressable>
    </View>
  );
}

export function PlaygroundScreen({ navigation }: Props) {
  const todayDateKey = useMemo(() => toDateKeyFromDate(new Date()), []);

  const [isLoading, setIsLoading] = useState(true);
  const [allDreams, setAllDreams] = useState<DreamRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);
  const [visibleMonthDate, setVisibleMonthDate] = useState(new Date());
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [pickerMonthIndex, setPickerMonthIndex] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const loadDreams = useCallback(async () => {
    try {
      setIsLoading(true);
      const dreams = await getPlaygroundDreams();
      setAllDreams(dreams);
      setVisibleCount(PAGE_SIZE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDreams();
    }, [loadDreams])
  );

  const filteredDreams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allDreams;

    return allDreams.filter((dream) => {
      const haystack = `${dream.dreamText} ${dream.interpretation ?? ""} ${dream.dreamDate}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [allDreams, searchQuery]);

  const visibleDreams = useMemo(
    () => filteredDreams.slice(0, visibleCount),
    [filteredDreams, visibleCount]
  );

  const calendarFilteredDreams = useMemo(
    () => filteredDreams.filter((dream) => toDateKeyFromDream(dream) === selectedDateKey),
    [filteredDreams, selectedDateKey]
  );

  const markedDates = useMemo(
    () => buildMarkedDates(allDreams, selectedDateKey),
    [allDreams, selectedDateKey]
  );

  const availableYears = useMemo(() => buildYearRange(allDreams), [allDreams]);

  const selectedDateLabel = useMemo(() => {
    const selectedDate = dateKeyToDate(selectedDateKey);
    if (!selectedDate) {
      return selectedDateKey;
    }

    return selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDateKey]);

  const canLoadMore = visibleCount < filteredDreams.length;

  const onLoadMore = () => {
    if (canLoadMore) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  };

  const onToggleCalendarView = () => {
    setViewMode((prev) => {
      if (prev === "list") {
        const selectedDate = dateKeyToDate(selectedDateKey) ?? new Date();
        setVisibleMonthDate(
          new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        );
        return "calendar";
      }
      return "list";
    });
  };

  const onOpenMonthYearPicker = () => {
    setPickerMonthIndex(visibleMonthDate.getMonth());
    setPickerYear(visibleMonthDate.getFullYear());
    setShowMonthYearPicker(true);
  };

  const onApplyMonthYear = () => {
    const currentSelectedDate = dateKeyToDate(selectedDateKey) ?? new Date();
    const safeDay = Math.min(
      currentSelectedDate.getDate(),
      new Date(pickerYear, pickerMonthIndex + 1, 0).getDate()
    );

    const nextSelectedDate = new Date(pickerYear, pickerMonthIndex, safeDay);
    setVisibleMonthDate(new Date(pickerYear, pickerMonthIndex, 1));
    setSelectedDateKey(toDateKeyFromDate(nextSelectedDate));
    setShowMonthYearPicker(false);
  };

  const onDeleteDream = (dream: DreamRecord) => {
    Alert.alert(
      t.playground.deleteConfirmTitle,
      t.playground.deleteConfirmMessage,
      [
        {
          text: t.playground.deleteCancelAction,
          style: "cancel",
        },
        {
          text: t.playground.deleteConfirmAction,
          style: "destructive",
          onPress: async () => {
            try {
              await deletePlaygroundDream(dream.id);
              setAllDreams((prev) => prev.filter((item) => item.id !== dream.id));
            } catch {
              Alert.alert("Error", t.playground.deleteError);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-bg-base">
      <View pointerEvents="none" className="absolute inset-0">
        <View
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 320,
            height: 320,
            borderRadius: 9999,
            backgroundColor: "#FFD6A8",
            opacity: 0.18,
          }}
        />
      </View>

      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-text-primary text-4xl font-semibold">
            {t.playground.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel={t.playground.calendarToggleA11y}
              onPress={onToggleCalendarView}
              className={[
                "rounded-full border px-3 py-2 active:opacity-90",
                viewMode === "calendar"
                  ? "border-brand-primary bg-brand-primary"
                  : "border-border-subtle bg-bg-surface",
              ].join(" ")}
            >
              <Text
                className={[
                  "text-lg",
                  viewMode === "calendar" ? "text-text-inverse" : "text-text-primary",
                ].join(" ")}
              >
                🗓
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowSearch((prev) => !prev)}
              className="rounded-full border border-border-subtle bg-bg-surface px-3 py-2 active:opacity-90"
            >
              <Text className="text-text-primary text-lg">⌕</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                navigation.navigate("DreamInput", { context: "playground" })
              }
              className="rounded-full bg-brand-primary px-4 py-2 active:opacity-90"
            >
              <Text className="text-text-inverse text-base font-semibold">
                + {t.playground.addDreamCta}
              </Text>
            </Pressable>
          </View>
        </View>

        {showSearch ? (
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t.playground.searchPlaceholder}
            placeholderTextColor="#8A8A8A"
            returnKeyType="search"
            className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3 text-text-primary text-base"
          />
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : viewMode === "list" ? (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110 }}
          data={visibleDreams}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PlaygroundDreamListItem
              dream={item}
              onPress={() =>
                navigation.navigate("DreamSummary", {
                  dream: item,
                  context: "playground",
                })
              }
              onDelete={() => onDeleteDream(item)}
            />
          )}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.6}
          ListEmptyComponent={
            <View className="mt-6 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4">
              <Text className="text-text-secondary text-[15px] leading-6">
                {t.playground.empty}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110 }}
          data={calendarFilteredDreams}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PlaygroundDreamListItem
              dream={item}
              onPress={() =>
                navigation.navigate("DreamSummary", {
                  dream: item,
                  context: "playground",
                })
              }
              onDelete={() => onDeleteDream(item)}
            />
          )}
          ListHeaderComponent={
            <>
              <View
                className="rounded-3xl border border-border-subtle bg-bg-surface p-4"
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 3,
                }}
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <Pressable
                    onPress={() =>
                      setVisibleMonthDate(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated active:opacity-90"
                  >
                    <Text className="text-text-primary text-xl">‹</Text>
                  </Pressable>

                  <Pressable
                    onPress={onOpenMonthYearPicker}
                    className="rounded-full border border-border-subtle bg-bg-elevated px-4 py-2 active:opacity-90"
                  >
                    <Text className="text-text-primary text-sm font-semibold">
                      {formatMonthYear(visibleMonthDate)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setVisibleMonthDate(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated active:opacity-90"
                  >
                    <Text className="text-text-primary text-xl">›</Text>
                  </Pressable>
                </View>

                <Calendar
                  current={toDateKeyFromDate(visibleMonthDate)}
                  onDayPress={(day: DateData) => {
                    setSelectedDateKey(day.dateString);
                    const selected = dateKeyToDate(day.dateString);
                    if (selected) {
                      setVisibleMonthDate(
                        new Date(selected.getFullYear(), selected.getMonth(), 1)
                      );
                    }
                  }}
                  onMonthChange={(month) => {
                    setVisibleMonthDate(new Date(month.year, month.month - 1, 1));
                  }}
                  markedDates={markedDates}
                  hideArrows
                  enableSwipeMonths
                  theme={{
                    todayTextColor: "#D97706",
                    monthTextColor: "#1F2937",
                    textDayFontWeight: "500",
                    textMonthFontWeight: "700",
                    textDayHeaderFontWeight: "600",
                    textSectionTitleColor: "#6B7280",
                  }}
                />
              </View>

              <View className="mt-3 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4">
                <Text className="text-text-primary text-base font-semibold">
                  {t.playground.calendarViewTitle}
                </Text>
                <Text className="text-text-secondary mt-1 text-sm">{selectedDateLabel}</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View className="mt-3 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4">
              <Text className="text-text-secondary text-[15px] leading-6">
                {t.playground.calendarNoDreamsForDate}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showMonthYearPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMonthYearPicker(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/30 px-6">
          <View className="w-full max-w-[420px] rounded-3xl border border-border-subtle bg-bg-surface p-5">
            <Text className="text-text-primary text-lg font-semibold">
              {t.playground.calendarJumpTitle}
            </Text>

            <ScrollView className="mt-3 max-h-[360px]" showsVerticalScrollIndicator={false}>
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-[0.8px]">
                {t.playground.calendarMonthLabel}
              </Text>

              <View className="mt-2 flex-row flex-wrap">
                {MONTH_NAMES.map((monthName, index) => (
                  <Pressable
                    key={monthName}
                    onPress={() => setPickerMonthIndex(index)}
                    className={[
                      "mb-2 rounded-xl border px-3 py-2",
                      pickerMonthIndex === index
                        ? "border-brand-primary bg-brand-primary"
                        : "border-border-default bg-bg-elevated",
                    ].join(" ")}
                    style={{
                      width: "32%",
                      marginRight: index % 3 === 2 ? "0%" : "2%",
                    }}
                  >
                    <Text
                      className={[
                        "text-center text-sm font-semibold",
                        pickerMonthIndex === index ? "text-text-inverse" : "text-text-primary",
                      ].join(" ")}
                    >
                      {monthName.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mt-3 text-text-secondary text-xs font-semibold uppercase tracking-[0.8px]">
                {t.playground.calendarYearLabel}
              </Text>

              <View className="mt-2 flex-row flex-wrap">
                {availableYears.map((year) => (
                  <Pressable
                    key={year}
                    onPress={() => setPickerYear(year)}
                    className={[
                      "mb-2 mr-2 rounded-xl border px-3 py-2",
                      pickerYear === year
                        ? "border-brand-primary bg-brand-primary"
                        : "border-border-default bg-bg-elevated",
                    ].join(" ")}
                  >
                    <Text
                      className={[
                        "text-sm font-semibold",
                        pickerYear === year ? "text-text-inverse" : "text-text-primary",
                      ].join(" ")}
                    >
                      {year}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                onPress={() => setShowMonthYearPicker(false)}
                className="rounded-full border border-border-default bg-bg-elevated px-4 py-2 active:opacity-90"
              >
                <Text className="text-text-primary text-sm font-semibold">
                  {t.playground.calendarCancelCta}
                </Text>
              </Pressable>

              <Pressable
                onPress={onApplyMonthYear}
                className="rounded-full bg-brand-primary px-4 py-2 active:opacity-90"
              >
                <Text className="text-text-inverse text-sm font-semibold">
                  {t.playground.calendarApplyCta}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabDock
        activeTab="home"
        onHomePress={() => navigation.navigate("Home")}
        onJournalPress={() => navigation.navigate("Journal")}
        onSettingsPress={() => navigation.navigate("Settings")}
      />
    </View>
  );
}
