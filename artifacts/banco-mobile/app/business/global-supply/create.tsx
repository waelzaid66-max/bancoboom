// Post a global supply / sourcing request (Task #40). Buyer-side form. Optional
// numeric fields are passed through as entered (no client math). On success we
// route to the detail with ranked supplier matches.
import { Feather } from "@/components/icons";
import { useUser } from "@clerk/expo";
import {
  CreateGlobalSupplyBody,
  CreateGlobalSupplyBodyCategory,
  CreateGlobalSupplyBodyIncoterms,
  useCreateGlobalSupply,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;

const CATEGORIES: CreateGlobalSupplyBodyCategory[] = ["car", "real_estate", "industrial"];
const INCOTERMS: NonNullable<CreateGlobalSupplyBodyIncoterms>[] = [
  "exw",
  "fca",
  "fob",
  "cfr",
  "cif",
  "dap",
  "ddp",
];

export default function CreateGlobalSupplyScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "right" | "left" = isRTL ? "right" : "left";
  const writeDir: "rtl" | "ltr" = isRTL ? "rtl" : "ltr";

  const { isSignedIn, isLoaded } = useUser();

  const [productText, setProductText] = useState("");
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState<CreateGlobalSupplyBodyCategory | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [incoterms, setIncoterms] = useState<NonNullable<CreateGlobalSupplyBodyIncoterms> | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateGlobalSupply();

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.secondary,
      color: colors.foreground,
      borderColor: colors.border,
      borderRadius: colors.radius,
      textAlign,
      writingDirection: writeDir,
    },
  ];

  const Header = (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 12,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
          flexDirection: rowDir,
        },
      ]}
    >
      <Pressable
        onPress={() => router.back()}
        style={styles.iconBtn}
        hitSlop={12}
        testID="global-supply-create-back"
      >
        <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.globalSupply.createTitle")}
      </AppText>
      <View style={styles.iconBtn} />
    </View>
  );

  if (isLoaded && !isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.stateWrap}>
          <Feather name="lock" size={48} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.common.signInRequired")}
          </AppText>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="global-supply-create-go-profile"
          >
            <AppText style={[styles.submitText, { color: colors.primaryForeground }]}>
              {t("business.common.goToProfile")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleSubmit = () => {
    if (!productText.trim()) {
      setError(t("business.globalSupply.errProduct"));
      return;
    }
    if (!destination.trim()) {
      setError(t("business.globalSupply.errDestination"));
      return;
    }
    setError(null);

    const body: CreateGlobalSupplyBody = {
      product_text: productText.trim(),
      destination_country: destination.trim(),
    };
    if (category) body.category = category;
    const qN = Number(quantity);
    if (quantity.trim() && !Number.isNaN(qN)) body.quantity = qN;
    if (unit.trim()) body.unit = unit.trim();
    const bN = Number(budgetMax);
    if (budgetMax.trim() && !Number.isNaN(bN)) body.budget_max = bN;
    if (currency.trim()) body.currency = currency.trim();
    if (incoterms) body.incoterms = incoterms;
    if (notes.trim()) body.notes = notes.trim();

    mutate(
      { data: body },
      {
        onSuccess: (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const newId = res.data?.id;
          if (newId) router.replace(`/business/global-supply/${newId}`);
          else router.replace("/business/global-supply");
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(t("business.globalSupply.errSubmit"));
        },
      },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FieldLabel label={t("business.globalSupply.fProduct")} colors={colors} textAlign={textAlign} />
        <TextInput
          value={productText}
          onChangeText={setProductText}
          placeholder={t("business.globalSupply.fProductPh")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[...inputStyle, styles.textArea]}
          testID="gs-field-product"
        />

        <FieldLabel label={t("business.globalSupply.fDestination")} colors={colors} textAlign={textAlign} />
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder={t("business.globalSupply.fDestinationPh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="gs-field-destination"
        />

        <FieldLabel
          label={t("business.globalSupply.fCategory")}
          tag={t("business.common.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <ChipRow
          options={CATEGORIES.map((c) => ({ value: c, label: t(`business.cat.${c}`) }))}
          selected={category}
          onSelect={(v) => setCategory((prev) => (prev === v ? null : (v as CreateGlobalSupplyBodyCategory)))}
          colors={colors}
          rowDir={rowDir}
        />

        <View style={[styles.twoCol, { flexDirection: rowDir }]}>
          <View style={styles.col}>
            <FieldLabel
              label={t("business.globalSupply.fQuantity")}
              tag={t("business.common.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
              testID="gs-field-quantity"
            />
          </View>
          <View style={styles.col}>
            <FieldLabel
              label={t("business.globalSupply.fUnit")}
              tag={t("business.common.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder={t("business.globalSupply.fUnitPh")}
              placeholderTextColor={colors.mutedForeground}
              style={inputStyle}
              testID="gs-field-unit"
            />
          </View>
        </View>

        <View style={[styles.twoCol, { flexDirection: rowDir }]}>
          <View style={styles.colWide}>
            <FieldLabel
              label={t("business.globalSupply.fBudgetMax")}
              tag={t("business.common.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <TextInput
              value={budgetMax}
              onChangeText={setBudgetMax}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
              testID="gs-field-budget"
            />
          </View>
          <View style={styles.colNarrow}>
            <FieldLabel label={t("business.globalSupply.fCurrency")} colors={colors} textAlign={textAlign} />
            <TextInput
              value={currency}
              onChangeText={setCurrency}
              placeholder={t("common.egp")}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              style={inputStyle}
              testID="gs-field-currency"
            />
          </View>
        </View>

        <FieldLabel
          label={t("business.globalSupply.fIncoterms")}
          tag={t("business.common.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <ChipRow
          options={INCOTERMS.map((i) => ({ value: i, label: i.toUpperCase() }))}
          selected={incoterms}
          onSelect={(v) =>
            setIncoterms((prev) =>
              prev === v ? null : (v as NonNullable<CreateGlobalSupplyBodyIncoterms>),
            )
          }
          colors={colors}
          rowDir={rowDir}
        />

        <FieldLabel
          label={t("business.globalSupply.fNotes")}
          tag={t("business.common.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[...inputStyle, styles.textArea]}
          testID="gs-field-notes"
        />

        {error ? (
          <AppText style={[styles.errorText, { color: colors.destructive, textAlign }]}>{error}</AppText>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={isPending}
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: isPending ? 0.7 : 1 },
          ]}
          testID="gs-submit"
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <AppText style={[styles.submitText, { color: colors.primaryForeground }]}>
              {t("business.globalSupply.submitRequest")}
            </AppText>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function FieldLabel({
  label,
  tag,
  colors,
  textAlign,
}: {
  label: string;
  tag?: string;
  colors: Colors;
  textAlign: "left" | "right";
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <AppText style={[styles.fieldLabel, { color: colors.foreground, textAlign }]}>
        {label}
        {tag ? (
          <AppText style={[styles.fieldTag, { color: colors.mutedForeground }]}>
            {"  "}
            {tag}
          </AppText>
        ) : null}
      </AppText>
    </View>
  );
}

function ChipRow({
  options,
  selected,
  onSelect,
  colors,
  rowDir,
}: {
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (value: string) => void;
  colors: Colors;
  rowDir: "row" | "row-reverse";
}) {
  return (
    <View style={[styles.chipRow, { flexDirection: rowDir }]}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.secondary,
                borderColor: active ? colors.primary : colors.border,
                borderRadius: colors.radius,
              },
            ]}
            testID={`gs-chip-${opt.value}`}
          >
            <AppText
              style={[styles.chipText, { color: active ? colors.primaryForeground : colors.foreground }]}
            >
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, paddingBottom: 140 },
  stateWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  stateTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  fieldLabelRow: { marginTop: 18, marginBottom: 7 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fieldTag: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
  twoCol: { gap: 12 },
  col: { flex: 1 },
  colWide: { flex: 2 },
  colNarrow: { flex: 1 },
  chipRow: { flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  errorText: { fontSize: 13.5, fontFamily: "Inter_500Medium", marginTop: 14 },
  submitBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 15, marginTop: 24 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
