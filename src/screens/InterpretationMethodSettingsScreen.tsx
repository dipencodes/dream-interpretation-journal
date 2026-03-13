import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import {
  getDefaultInterpretMethod,
  setDefaultInterpretMethod,
  type InterpretMethodKey,
} from "../services/appPreferences";
import { t } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "InterpretationMethodSettings">;

type MethodOption = {
  key: InterpretMethodKey | "none";
  label: string;
};

const METHOD_OPTIONS: MethodOption[] = [
  { key: "none", label: "None" },
  { key: "hindu", label: "Hinduism" },
  { key: "buddhist", label: "Buddhism" },
  { key: "christian", label: "Christianity" },
  { key: "islamic", label: "Islam" },
  { key: "scientific", label: "Scientific" },
];

export function InterpretationMethodSettingsScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<InterpretMethodKey | "none">("none");

  const loadDefault = useCallback(async () => {
    try {
      setIsLoading(true);
      const current = await getDefaultInterpretMethod();
      setSelected(current ?? "none");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onSelect = async (value: InterpretMethodKey | "none") => {
    setSelected(value);
    await setDefaultInterpretMethod(value === "none" ? null : value);
  };

  useFocusEffect(
    useCallback(() => {
      loadDefault();
    }, [loadDefault])
  );

  return (
    <View className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-bg-surface active:opacity-90"
        >
          <Text className="text-text-primary text-2xl">‹</Text>
        </Pressable>

        <Text className="text-text-primary mt-5 text-4xl font-semibold">
          {t.settings.interpretationTitle}
        </Text>
        <Text className="text-text-secondary mt-2 text-[15px] leading-6">
          {t.settings.interpretationSubtitle}
        </Text>

        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator />
          </View>
        ) : (
          <View className="mt-6">
            {METHOD_OPTIONS.map((option) => {
              const active = option.key === selected;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => onSelect(option.key)}
                  className={[
                    "mt-3 rounded-2xl border px-4 py-4 active:opacity-90",
                    active
                      ? "border-brand-primary bg-brand-saffron/20"
                      : "border-border-subtle bg-bg-surface",
                  ].join(" ")}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-text-primary text-base font-semibold">
                      {option.label}
                    </Text>
                    <View
                      className={[
                        "h-5 w-5 rounded-full border items-center justify-center",
                        active ? "border-brand-primary" : "border-border-default",
                      ].join(" ")}
                    >
                      {active ? <View className="h-2.5 w-2.5 rounded-full bg-brand-primary" /> : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
