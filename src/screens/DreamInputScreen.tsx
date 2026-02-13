import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { t } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "DreamInput">;

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Dots({ activeIndex = 1, total = 2 }) {
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

export function DreamInputScreen({ navigation }: Props) {
  const [dreamText, setDreamText] = useState("");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const canContinue = useMemo(() => dreamText.trim().length >= 10, [dreamText]);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) setDate(selected);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-base"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Background blobs stay */}
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
            opacity: 0.10,
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
            backgroundColor: "#9CC7FF",
            opacity: 0.14,
          }}
        />
      </View>

      <View className="flex-1 px-6 pt-14 pb-6">
        <Dots activeIndex={1} total={2} />

        {/* Title */}
        <View className="mt-5">
          <Text className="text-text-primary text-center text-3xl font-semibold">
            {t.dreamInput.title}
          </Text>
          <Text className="text-text-secondary mt-2 text-center text-[15px] leading-6">
            {t.dreamInput.subtitle}
          </Text>
        </View>

        {/* Illustration */}
        <View className="mt-6 items-center">
          <Image
            source={require("../../assets/images/dream.png")}
            style={{
              width: "100%",
              height: 190,
              resizeMode: "contain",
            }}
          />
        </View>

        {/* Card */}
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
          <Text className="text-text-secondary text-sm font-semibold">
            {t.dreamInput.dateLabel}
          </Text>

          <Pressable
            onPress={() => setShowPicker(true)}
            className="mt-2 flex-row items-center justify-between rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3"
          >
            <Text className="text-text-primary text-base font-medium">
              {formatDate(date)}
            </Text>
            <Text className="text-text-secondary text-2xl">›</Text>
          </Pressable>

          {showPicker && (
            <View className="mt-2">
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
              />
            </View>
          )}

          {/* MESSAGE BOX — FIXED HEIGHT */}
          <View className="mt-4 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3">
            <TextInput
              value={dreamText}
              onChangeText={setDreamText}
              placeholder={t.dreamInput.placeholder}
              placeholderTextColor="#7A7A7A"
              multiline
              textAlignVertical="top"
              style={{ height: 120 }}   // ← THIS FIXES IT
              className="text-text-primary text-base"
            />

            <View className="mt-3 h-[1px] bg-border-subtle opacity-70" />
            <Text className="text-text-secondary mt-3 text-sm leading-5">
              {t.dreamInput.helper}
            </Text>
          </View>
        </View>

        {/* CTA */}
        <View className="mt-6">
          <Pressable
            onPress={() =>
              Alert.alert(
                "Interpret (placeholder)",
                `Date: ${formatDate(date)}\n\n${dreamText.trim()}`
              )
            }
            disabled={!canContinue}
            className={[
              "rounded-full px-6 py-4",
              canContinue
                ? "bg-brand-primary active:opacity-90"
                : "bg-border-default opacity-70",
            ].join(" ")}
          >
            <Text className="text-text-inverse text-center text-base font-semibold">
              {t.dreamInput.cta}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
