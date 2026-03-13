import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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

const PAGE_SIZE = 10;

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
  const [isLoading, setIsLoading] = useState(true);
  const [allDreams, setAllDreams] = useState<DreamRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

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

  const canLoadMore = visibleCount < filteredDreams.length;

  const onLoadMore = () => {
    if (canLoadMore) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
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
              onPress={() => setShowSearch((prev) => !prev)}
              className="rounded-full border border-border-subtle bg-bg-surface px-3 py-2 active:opacity-90"
            >
              <Text className="text-text-primary text-lg">⌕</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                navigation.navigate("DreamInput", {
                  context: "playground",
                  postCreateBackTarget: "playground",
                })
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
      ) : (
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
      )}

      <BottomTabDock
        activeTab="playground"
        onHomePress={() => navigation.navigate("Home")}
        onJournalPress={() => navigation.navigate("Journal")}
        onPlaygroundPress={() => {}}
        onSettingsPress={() => navigation.navigate("Settings")}
      />
    </View>
  );
}
