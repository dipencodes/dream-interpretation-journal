import React from "react";
import { Pressable, Text, View } from "react-native";

type TabKey = "home" | "journal" | "settings";

type Props = {
  activeTab: TabKey;
  onHomePress: () => void;
  onJournalPress: () => void;
  onSettingsPress: () => void;
};

function DockItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1 items-center py-3 active:opacity-90">
      <Text className={active ? "text-brand-primary text-2xl" : "text-text-secondary text-2xl"}>
        {icon}
      </Text>
      <Text className={active ? "text-brand-primary text-xs mt-1" : "text-text-secondary text-xs mt-1"}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomTabDock({
  activeTab,
  onHomePress,
  onJournalPress,
  onSettingsPress,
}: Props) {
  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-border-subtle bg-bg-surface px-5 pb-6 pt-2"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 10,
      }}
    >
      <View className="flex-row">
        <DockItem
          icon="⌂"
          label="Home"
          active={activeTab === "home"}
          onPress={onHomePress}
        />
        <DockItem
          icon="▦"
          label="Journal"
          active={activeTab === "journal"}
          onPress={onJournalPress}
        />
        <DockItem
          icon="⚙"
          label="Settings"
          active={activeTab === "settings"}
          onPress={onSettingsPress}
        />
      </View>
    </View>
  );
}
