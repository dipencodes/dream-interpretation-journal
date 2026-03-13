import React, { useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  ImageBackground,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { t } from "../i18n";
import { setHasCompletedOnboarding } from "../services/appPreferences";

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

export function DreamInputScreen({ route, navigation }: Props) {
  const context = route.params?.context ?? "journal";
  const postCreateBackTarget = route.params?.postCreateBackTarget;
  const [dreamText, setDreamText] = useState("");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const canContinue = useMemo(() => dreamText.trim().length >= 10, [dreamText]);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) setDate(selected);
  };

  const onContinuePress = () => {
    if (!canContinue) return;

    const dreamDateFormatted = date.toISOString().split("T")[0];
    navigation.navigate("DreamMood", {
      dreamText: dreamText.trim(),
      dreamDate: dreamDateFormatted,
      context,
      postCreateBackTarget,
    });
  };

  const onAddLaterPress = async () => {
    await setHasCompletedOnboarding(true);
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };
  

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Dream input over illustration background */}
          <View className="mt-6 items-center">
            <ImageBackground
              source={require("../../assets/images/dream.png")}
              style={styles.dreamInputBackground}
              imageStyle={styles.dreamInputBackgroundImage}
            >
              <View style={styles.dreamInputOverlay}>
                <TextInput
                  value={dreamText}
                  onChangeText={setDreamText}
                  placeholder={t.dreamInput.placeholder}
                  placeholderTextColor="#7A7A7A"
                  multiline
                  textAlignVertical="top"
                  blurOnSubmit={false}
                  style={styles.dreamTextInput}
                  className="text-text-primary text-base"
                />

                <View className="mt-3 h-[1px] bg-border-subtle opacity-70" />
                <Text className="text-text-secondary mt-3 text-sm leading-5">
                  {t.dreamInput.helper}
                </Text>
              </View>
            </ImageBackground>
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

          </View>

          {/* CTA */}
          <View className="mt-6">
            <Pressable
              onPress={onContinuePress}
              disabled={!canContinue}
              className={[
                "rounded-full px-6 py-4 flex-row items-center justify-center gap-2",
                canContinue
                  ? "bg-brand-primary active:opacity-90"
                  : "bg-border-default opacity-70",
              ].join(" ")}
            >
              <Text className="text-text-inverse text-center text-base font-semibold">
                {t.dreamInput.cta}
              </Text>
            </Pressable>

            {!canContinue && context === "journal" ? (
              <Pressable
                onPress={onAddLaterPress}
                className="mt-4 self-center rounded-full px-4 py-2 active:opacity-80"
              >
                <Text className="text-brand-primary text-sm font-semibold">
                  {t.dreamInput.addLaterCta}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  dreamInputBackground: {
    width: "100%",
    minHeight: 230,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  dreamInputBackgroundImage: {
    resizeMode: "cover",
    opacity: 0.92,
  },
  dreamInputOverlay: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 24,
    margin: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dreamTextInput: {
    minHeight: 115,
  },
});
