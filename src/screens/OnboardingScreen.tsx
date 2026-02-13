import React from "react";
import { Pressable, Text, View } from "react-native";
import { t } from "../i18n";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

function Bubble({
  size,
  emoji,
  className = "",
}: {
  size: number;
  emoji: string;
  className?: string;
}) {
  return (
    <View
      className={[
        "items-center justify-center rounded-full border border-border-subtle bg-bg-elevated",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      <Text style={{ fontSize: Math.max(14, size * 0.35) }}>{emoji}</Text>
    </View>
  );
}

function Dots({ activeIndex = 0, total = 2 }: { activeIndex?: number; total?: number }) {
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

export function OnboardingScreen({ navigation }: Props) {
  return (
    <View className="flex-1 bg-bg-base">
      <View className="flex-1 px-6 pt-14 pb-10">
        <Dots activeIndex={0} total={2} />

        <View className="mt-10 items-center justify-center">
          <View className="relative h-56 w-56">
            <View className="absolute left-[78px] top-[78px]">
              <Bubble size={88} emoji="😊" className="bg-brand-primary/10" />
            </View>
            <View className="absolute left-[20px] top-[40px]">
              <Bubble size={64} emoji="👀" className="bg-state-info/10" />
            </View>
            <View className="absolute right-[18px] top-[52px]">
              <Bubble size={56} emoji="💭" className="bg-state-success/10" />
            </View>
            <View className="absolute left-[28px] bottom-[34px]">
              <Bubble size={54} emoji="✨" className="bg-brand-saffron/15" />
            </View>
            <View className="absolute right-[28px] bottom-[28px]">
              <Bubble size={60} emoji="😴" className="bg-state-warning/10" />
            </View>
            <View className="absolute left-[4px] top-[120px]">
              <Bubble size={34} emoji="🌙" className="bg-brand-primary/10" />
            </View>
            <View className="absolute right-[6px] top-[132px]">
              <Bubble size={32} emoji="🧠" className="bg-state-info/10" />
            </View>
          </View>
        </View>

        <View className="mt-6 px-2">
          <Text className="text-text-primary text-center text-3xl font-semibold leading-9">
            {t.onboarding.title}
          </Text>
          <Text className="text-text-secondary mt-3 text-center text-base leading-6">
            {t.onboarding.subtitle}
          </Text>
        </View>

        <View className="flex-1 justify-end">
          <Pressable
            onPress={() => navigation.navigate("DreamInput")}
            className="rounded-full bg-brand-primary px-6 py-4 active:opacity-90 shadow-sm"
          >
            <Text className="text-text-inverse text-center text-base font-semibold">
              {t.onboarding.cta}
            </Text>
          </Pressable>
          <View className="h-3" />
        </View>
      </View>
    </View>
  );
}
