import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { t } from "../i18n";

type BirthDetails = {
  name: string;
  dobISO: string; // YYYY-MM-DD
  birthCity: string;
  birthCountry: string;
  tob: string; // HH:MM:SS
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isValidTimeHHMMSS(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(value);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-text-primary font-semibold">{children}</Text>;
}

export function OnboardingScreen(props: { onNext?: (details: BirthDetails) => void }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [birthCity, setBirthCity] = useState("");
  const [birthCountry, setBirthCountry] = useState("");
  const [tob, setTob] = useState("");

  const [focus, setFocus] = useState<
    "name" | "city" | "country" | "tob" | null
  >(null);

  const dobISO = useMemo(() => (dob ? formatISODate(dob) : ""), [dob]);
  const timeValid = tob.length > 0 && isValidTimeHHMMSS(tob);

  const canContinue =
    name.trim().length > 0 &&
    !!dob &&
    birthCity.trim().length > 0 &&
    birthCountry.trim().length > 0 &&
    timeValid;

  const onDobChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDobPicker(false);
    if (selected) setDob(selected);
  };

  const handleNext = () => {
    if (!canContinue) return;
    props.onNext?.({
      name: name.trim(),
      dobISO,
      birthCity: birthCity.trim(),
      birthCountry: birthCountry.trim(),
      tob,
    });
  };

  const inputBase =
    "mt-2 rounded-2xl border bg-bg-elevated px-4 py-3 text-text-primary";

  const borderFor = (key: typeof focus) =>
    focus === key ? "border-brand-saffron" : "border-border-subtle";

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-base"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-10 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {/* Soft decorative header */}
        <View className="relative overflow-hidden rounded-3xl bg-bg-surface border border-border-subtle px-5 pt-6 pb-5 shadow-sm">
          {/* subtle “aura” blobs */}
          <View className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-brand-saffron opacity-20" />
          <View className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-brand-primary opacity-15" />

          <Text className="text-text-secondary text-sm font-semibold">
            {t.onboarding.stepLabel}
          </Text>

          <Text className="text-text-primary mt-1 text-3xl font-semibold">
            {t.onboarding.title}
          </Text>
          <Text className="text-text-secondary mt-2 leading-5">
            {t.onboarding.subtitle}
          </Text>

          {/* Trust badge */}
          <View className="mt-4 self-start rounded-full bg-bg-elevated border border-border-subtle px-3 py-1">
            <Text className="text-text-secondary text-xs font-semibold">
              {t.onboarding.badge}
            </Text>
          </View>

          {/* Progress dots */}
          <View className="mt-4 flex-row items-center gap-2">
            <View className="h-2 w-10 rounded-full bg-brand-primary" />
            <View className="h-2 w-2 rounded-full bg-border-default" />
          </View>
        </View>

        {/* Main card */}
        <View className="mt-5 rounded-3xl bg-bg-surface border border-border-subtle p-5 shadow-sm">
          {/* Section header */}
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary text-lg font-semibold">
              {t.onboarding.sectionTitle}
            </Text>
            <View className="h-1 w-12 rounded-full bg-brand-saffron opacity-80" />
          </View>

          {/* Name */}
          <View className="mt-4">
            <FieldLabel>{t.onboarding.nameLabel}</FieldLabel>
            <TextInput
              className={[inputBase, borderFor("name")].join(" ")}
              placeholder={t.onboarding.namePlaceholder}
              placeholderTextColor="#6B6B6B"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => setFocus("name")}
              onBlur={() => setFocus(null)}
            />
          </View>

          {/* DOB */}
          <View className="mt-4">
            <FieldLabel>{t.onboarding.dobLabel}</FieldLabel>
            <Pressable
              className={[
                "mt-2 rounded-2xl border bg-bg-elevated px-4 py-3 active:opacity-90",
                showDobPicker ? "border-brand-saffron" : "border-border-subtle",
              ].join(" ")}
              onPress={() => setShowDobPicker(true)}
            >
              <Text className={dob ? "text-text-primary" : "text-text-secondary"}>
                {dob ? dobISO : t.onboarding.dobPlaceholder}
              </Text>
            </Pressable>

            {showDobPicker && (
              <View className="mt-2">
                <DateTimePicker
                  value={dob ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDobChange}
                  maximumDate={new Date()}
                />
                {Platform.OS === "ios" && (
                  <Pressable
                    onPress={() => setShowDobPicker(false)}
                    className="mt-2 self-start rounded-2xl bg-brand-primary px-4 py-2 active:opacity-90"
                  >
                    <Text className="text-text-inverse font-semibold">Done</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Place of birth */}
          <View className="mt-4">
            <FieldLabel>{t.onboarding.pobLabel}</FieldLabel>
            <View className="mt-2 flex-row gap-3">
              <TextInput
                className={[inputBase, "flex-1", borderFor("city")].join(" ")}
                placeholder={t.onboarding.cityPlaceholder}
                placeholderTextColor="#6B6B6B"
                value={birthCity}
                onChangeText={setBirthCity}
                onFocus={() => setFocus("city")}
                onBlur={() => setFocus(null)}
              />
              <TextInput
                className={[inputBase, "flex-1", borderFor("country")].join(" ")}
                placeholder={t.onboarding.countryPlaceholder}
                placeholderTextColor="#6B6B6B"
                value={birthCountry}
                onChangeText={setBirthCountry}
                onFocus={() => setFocus("country")}
                onBlur={() => setFocus(null)}
              />
            </View>
          </View>

          {/* Time of birth */}
          <View className="mt-4">
            <FieldLabel>{t.onboarding.tobLabel}</FieldLabel>
            <TextInput
              className={[
                inputBase,
                focus === "tob"
                  ? "border-brand-saffron"
                  : tob.length > 0 && !timeValid
                    ? "border-state-danger"
                    : "border-border-subtle",
              ].join(" ")}
              placeholder={t.onboarding.tobPlaceholder}
              placeholderTextColor="#6B6B6B"
              value={tob}
              onChangeText={setTob}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              maxLength={8}
              onFocus={() => setFocus("tob")}
              onBlur={() => setFocus(null)}
            />
            <Text className="text-text-secondary mt-2 text-sm">
              {t.onboarding.tobHelper}
            </Text>
            {tob.length > 0 && !timeValid && (
              <Text className="mt-1 text-state-danger text-sm">
                {t.common.invalidTime}
              </Text>
            )}
          </View>

          {/* CTA */}
          <Pressable
            onPress={handleNext}
            disabled={!canContinue}
            className={[
              "mt-6 rounded-2xl px-5 py-4",
              canContinue
                ? "bg-brand-primary active:opacity-90"
                : "bg-border-default opacity-70",
            ].join(" ")}
          >
            <Text className="text-text-inverse text-center text-base font-semibold">
              {t.onboarding.next}
            </Text>
          </Pressable>

          <Text className="text-text-secondary mt-3 text-center text-sm">
            {t.onboarding.nextHint}
          </Text>
        </View>

        {/* Gentle footer spacing */}
        <View className="h-6" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
