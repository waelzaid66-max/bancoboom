// Car-import request form — creates an import_order via the API, then returns to
// the tracking screen (which refetches). Minimal fields mapped to CreateImportOrderBody.
import { Feather } from "@/components/icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateImportOrder,
  getListMyImportOrdersQueryKey,
} from "@workspace/api-client-react";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function ImportRequestScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";
  const queryClient = useQueryClient();

  const [vehicle, setVehicle] = useState("");
  const [origin, setOrigin] = useState("");
  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");

  const { mutate, isPending } = useCreateImportOrder({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getListMyImportOrdersQueryKey(),
        });
        Alert.alert(t("importTrack.reqSuccess"));
        router.back();
      },
      onError: () => Alert.alert(t("importTrack.reqError")),
    },
  });

  const submit = () => {
    if (isPending) return;
    const n = Number(budget.replace(/[^0-9.]/g, ""));
    mutate({
      data: {
        origin_country: origin.trim() || undefined,
        budget_amount: budget.trim() && !Number.isNaN(n) ? n : undefined,
        note: note.trim() || undefined,
        details: vehicle.trim() ? { vehicle: vehicle.trim() } : undefined,
      },
    });
  };

  const inputStyle = [
    styles.input,
    {
      color: colors.foreground,
      borderColor: colors.border,
      backgroundColor: colors.card,
      textAlign,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 10,
            borderBottomColor: colors.border,
            flexDirection: rowDir,
          },
        ]}
        testID="import-request-header"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("importTrack.reqTitle")}
        </AppText>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText
          style={[styles.sub, { color: colors.mutedForeground, textAlign }]}
        >
          {t("importTrack.reqSub")}
        </AppText>

        <AppText style={[styles.label, { color: colors.foreground, textAlign }]}>
          {t("importTrack.reqVehicle")}
        </AppText>
        <TextInput
          value={vehicle}
          onChangeText={setVehicle}
          placeholder={t("importTrack.reqVehiclePh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
        />

        <AppText style={[styles.label, { color: colors.foreground, textAlign }]}>
          {t("importTrack.reqOrigin")}
        </AppText>
        <TextInput
          value={origin}
          onChangeText={setOrigin}
          placeholder={t("importTrack.reqOriginPh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
        />

        <AppText style={[styles.label, { color: colors.foreground, textAlign }]}>
          {t("importTrack.reqBudget")}
        </AppText>
        <TextInput
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          placeholder={t("importTrack.reqBudgetPh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
        />

        <AppText style={[styles.label, { color: colors.foreground, textAlign }]}>
          {t("importTrack.reqNote")}
        </AppText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t("importTrack.reqNotePh")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[inputStyle, styles.multiline]}
        />

        <Pressable
          onPress={submit}
          disabled={isPending}
          style={[styles.submit, { opacity: isPending ? 0.6 : 1 }]}
          testID="import-request-submit"
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <AppText style={styles.submitText}>
              {t("importTrack.reqSubmit")}
            </AppText>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  submit: {
    marginTop: 20,
    backgroundColor: "#E53935",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Cairo_700Bold" },
});
