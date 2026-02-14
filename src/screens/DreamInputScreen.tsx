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
  ActivityIndicator,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { t } from "../i18n";
import { ensureAnonymousAuth } from "../services/auth";
import app from "@react-native-firebase/app";
import { getOrCreateUserGate } from "../services/userGate";

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
  const [isInterpreting, setIsInterpreting] = useState(false);

  const canContinue = useMemo(() => dreamText.trim().length >= 10, [dreamText]);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) setDate(selected);
  };

  const onInterpretPress = async () => {
    if (!canContinue || isInterpreting) return;
  
    try {
      setIsInterpreting(true);
  
      // 1) Anonymous auth (on demand)
      const { uid } = await ensureAnonymousAuth();
  
      // 2) Fetch or create user gate doc
      const gate = await getOrCreateUserGate(uid);
  
      // 3) Gate logic (no RevenueCat yet; we’ll plug it in next)
      if (gate.freeUsed) {
        Alert.alert(
          "Paywall (placeholder)",
          "You’ve used your free interpretation. Next step: show RevenueCat paywall here."
        );
        return;
      }
  
      // 4) Allowed (placeholder for Cloud Function call)
      Alert.alert(
        "Interpret (placeholder)",
        `UID: ${uid}\nFree used: ${gate.freeUsed}\n\nDate: ${formatDate(date)}\n\n${dreamText.trim()}`
      );
  
      // IMPORTANT:
      // We are NOT setting freeUsed=true here.
      // You asked to set it only after a successful interpretation returns.
      // We’ll flip it once your Cloud Function returns success.
    } catch (e: any) {
      Alert.alert(
        "Something went wrong",
        e?.message ?? "Please try again."
      );
    } finally {
      setIsInterpreting(false);
    }
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
              style={{ height: 120 }}
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
            onPress={onInterpretPress}
            disabled={!canContinue || isInterpreting}
            className={[
              "rounded-full px-6 py-4 flex-row items-center justify-center gap-2",
              canContinue && !isInterpreting
                ? "bg-brand-primary active:opacity-90"
                : "bg-border-default opacity-70",
            ].join(" ")}
          >
            {isInterpreting ? (
              <ActivityIndicator />
            ) : null}
            <Text className="text-text-inverse text-center text-base font-semibold">
              {isInterpreting ? "Signing in..." : t.dreamInput.cta}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
