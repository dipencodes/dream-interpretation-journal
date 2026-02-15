import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { BottomTabDock } from "../components/BottomTabDock";
import { t } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

function SettingsItem({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-3 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4 active:opacity-90"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-text-primary text-base font-semibold">{title}</Text>
          <Text className="text-text-secondary mt-1 text-sm leading-5">{subtitle}</Text>
        </View>
        <Text className="text-brand-copper text-xl">›</Text>
      </View>
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  return (
    <View className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text-primary text-4xl font-semibold">
          {t.settings.title}
        </Text>
        <Text className="text-text-secondary mt-2 text-[15px] leading-6">
          {t.settings.subtitle}
        </Text>

        <View className="mt-6">
          <SettingsItem
            title={t.settings.interpretationTitle}
            subtitle={t.settings.interpretationMenuSubtitle}
            onPress={() => navigation.navigate("InterpretationMethodSettings")}
          />
          <SettingsItem
            title={t.settings.notificationsTitle}
            subtitle={t.settings.notificationsMenuSubtitle}
            onPress={() => navigation.navigate("NotificationSettings")}
          />
        </View>
      </ScrollView>

      <BottomTabDock
        activeTab="settings"
        onHomePress={() => navigation.navigate("Home")}
        onJournalPress={() => navigation.navigate("Journal")}
        onSettingsPress={() => {}}
      />
    </View>
  );
}
