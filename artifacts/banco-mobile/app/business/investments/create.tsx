// Create an investment opportunity (Task #40). Standalone entity, NOT a listing.
// All figures the seller enters are stored as seller-provided/estimate and shown
// with a not-verified note. No client math; numbers passed through as entered.
import { Feather } from "@/components/icons";
import { useUser } from "@clerk/expo";
import {
  CreateInvestmentBody,
  CreateInvestmentBodyFiguresSource,
  CreateInvestmentBodyIndustry,
  CreateInvestmentBodyInvestmentType,
  useCreateInvestment,
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

const TYPES: CreateInvestmentBodyInvestmentType[] = [
  "factory_sale",
  "business_sale",
  "production_line_investment",
  "franchise",
  "partnership",
];

const INDUSTRIES: CreateInvestmentBodyIndustry[] = [
  "food",
  "beverage",
  "plastic",
  "textile",
  "pharmaceutical",
  "chemical",
  "engineering",
  "other",
];

const FIGURES_SOURCES: {
  value: CreateInvestmentBodyFiguresSource;
  labelKey: string;
}[] = [
  { value: "seller_provided", labelKey: "business.investments.figuresSellerProvided" },
  { value: "estimate", labelKey: "business.investments.figuresEstimate" },
];

export default function CreateInvestmentScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "right" | "left" = isRTL ? "right" : "left";
  const writeDir: "rtl" | "ltr" = isRTL ? "rtl" : "ltr";

  const { isSignedIn, isLoaded } = useUser();

  const [investmentType, setInvestmentType] =
    useState<CreateInvestmentBodyInvestmentType>("factory_sale");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState<CreateInvestmentBodyIndustry | null>(null);
  const [totalValue, setTotalValue] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [roi, setRoi] = useState("");
  const [payback, setPayback] = useState("");
  const [revenueMin, setRevenueMin] = useState("");
  const [revenueMax, setRevenueMax] = useState("");
  const [costNote, setCostNote] = useState("");
  const [growthNote, setGrowthNote] = useState("");
  const [figuresSource, setFiguresSource] =
    useState<CreateInvestmentBodyFiguresSource>("seller_provided");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateInvestment();

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
        testID="investment-create-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.investments.createTitle")}
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
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="investment-create-go-profile"
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
    if (!title.trim()) {
      setError(t("business.investments.errTitle"));
      return;
    }
    if (!location.trim()) {
      setError(t("business.investments.errLocation"));
      return;
    }
    const value = Number(totalValue);
    if (!totalValue.trim() || Number.isNaN(value)) {
      setError(t("business.investments.errValue"));
      return;
    }
    setError(null);

    const body: CreateInvestmentBody = {
      investment_type: investmentType,
      title: title.trim(),
      location: location.trim(),
      total_value_amount: value,
      figures_source: figuresSource,
    };
    if (description.trim()) body.description = description.trim();
    if (industry) body.industry = industry;
    if (currency.trim()) body.currency = currency.trim();
    const roiN = Number(roi);
    if (roi.trim() && !Number.isNaN(roiN)) body.expected_roi_pct = roiN;
    const pbN = Number(payback);
    if (payback.trim() && !Number.isNaN(pbN)) body.payback_years = pbN;
    const rmin = Number(revenueMin);
    if (revenueMin.trim() && !Number.isNaN(rmin)) body.revenue_range_min = rmin;
    const rmax = Number(revenueMax);
    if (revenueMax.trim() && !Number.isNaN(rmax)) body.revenue_range_max = rmax;
    if (costNote.trim()) body.cost_structure_note = costNote.trim();
    if (growthNote.trim()) body.growth_potential_note = growthNote.trim();

    mutate(
      { data: body },
      {
        onSuccess: (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const newId = res.data?.id;
          if (newId) router.replace(`/business/investments/${newId}`);
          else router.replace("/business/investments");
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(t("business.investments.errSubmit"));
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
        <FieldLabel label={t("business.investments.fType")} colors={colors} textAlign={textAlign} />
        <ChipRow
          options={TYPES.map((v) => ({ value: v, label: t(`business.investments.type.${v}`) }))}
          selected={investmentType}
          onSelect={(v) => setInvestmentType(v as CreateInvestmentBodyInvestmentType)}
          colors={colors}
          rowDir={rowDir}
        />

        <FieldLabel label={t("business.investments.fTitle")} colors={colors} textAlign={textAlign} />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("business.investments.fTitlePh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="investment-field-title"
        />

        <FieldLabel label={t("business.investments.fLocation")} colors={colors} textAlign={textAlign} />
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder={t("business.investments.fLocationPh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="investment-field-location"
        />

        <FieldLabel
          label={t("business.investments.fIndustry")}
          tag={t("business.common.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <ChipRow
          options={INDUSTRIES.map((v) => ({ value: v, label: t(`business.ind.${v}`) }))}
          selected={industry}
          onSelect={(v) =>
            setIndustry((prev) => (prev === v ? null : (v as CreateInvestmentBodyIndustry)))
          }
          colors={colors}
          rowDir={rowDir}
        />

        <View style={[styles.twoCol, { flexDirection: rowDir }]}>
          <View style={styles.colWide}>
            <FieldLabel label={t("business.investments.fTotalValue")} colors={colors} textAlign={textAlign} />
            <TextInput
              value={totalValue}
              onChangeText={setTotalValue}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
              testID="investment-field-value"
            />
          </View>
          <View style={styles.colNarrow}>
            <FieldLabel label={t("business.investments.fCurrency")} colors={colors} textAlign={textAlign} />
            <TextInput
              value={currency}
              onChangeText={setCurrency}
              placeholder={t("common.egp")}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              style={inputStyle}
              testID="investment-field-currency"
            />
          </View>
        </View>

        <View style={[styles.twoCol, { flexDirection: rowDir }]}>
          <View style={styles.col}>
            <FieldLabel
              label={t("business.investments.fRoi")}
              tag={t("business.common.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <TextInput
              value={roi}
              onChangeText={setRoi}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
              testID="investment-field-roi"
            />
          </View>
          <View style={styles.col}>
            <FieldLabel
              label={t("business.investments.fPayback")}
              tag={t("business.common.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <TextInput
              value={payback}
              onChangeText={setPayback}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
              testID="investment-field-payback"
            />
          </View>
        </View>

        <View style={[styles.twoCol, { flexDirection: rowDir }]}>
          <View style={styles.col}>
            <FieldLabel
              label={t("business.investments.fRevenueMin")}
              tag={t("business.common.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <TextInput
              value={revenueMin}
              onChangeText={setRevenueMin}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
              testID="investment-field-revenue-min"
            />
          </View>
          <View style={styles.col}>
            <FieldLabel
              label={t("business.investments.fRevenueMax")}
              tag={t("business.common.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <TextInput
              value={revenueMax}
              onChangeText={setRevenueMax}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
              testID="investment-field-revenue-max"
            />
          </View>
        </View>

        <FieldLabel
          label={t("business.investments.fCostNote")}
          tag={t("business.common.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={costNote}
          onChangeText={setCostNote}
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[...inputStyle, styles.textArea]}
          testID="investment-field-cost-note"
        />

        <FieldLabel
          label={t("business.investments.fGrowthNote")}
          tag={t("business.common.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={growthNote}
          onChangeText={setGrowthNote}
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[...inputStyle, styles.textArea]}
          testID="investment-field-growth-note"
        />

        <FieldLabel label={t("business.investments.fFiguresSource")} colors={colors} textAlign={textAlign} />
        <ChipRow
          options={FIGURES_SOURCES.map((f) => ({ value: f.value, label: t(f.labelKey) }))}
          selected={figuresSource}
          onSelect={(v) => setFiguresSource(v as CreateInvestmentBodyFiguresSource)}
          colors={colors}
          rowDir={rowDir}
        />

        <View style={[styles.figuresHint, { flexDirection: rowDir }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <AppText
            style={[styles.figuresHintText, { color: colors.mutedForeground, textAlign }]}
          >
            {t("business.investments.figuresHint")}
          </AppText>
        </View>

        <FieldLabel
          label={t("business.investments.fDescription")}
          tag={t("business.common.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("business.investments.fDescriptionPh")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[...inputStyle, styles.textArea]}
          testID="investment-field-description"
        />

        {error ? (
          <AppText style={[styles.errorText, { color: colors.destructive, textAlign }]}>
            {error}
          </AppText>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={isPending}
          style={[
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: isPending ? 0.7 : 1,
              flexDirection: rowDir,
            },
          ]}
          testID="investment-submit"
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <AppText style={[styles.submitText, { color: colors.primaryForeground }]}>
              {t("business.investments.submit")}
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
            testID={`investment-chip-${opt.value}`}
          >
            <AppText
              style={[
                styles.chipText,
                { color: active ? colors.primaryForeground : colors.foreground },
              ]}
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
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
  twoCol: { gap: 12 },
  col: { flex: 1 },
  colWide: { flex: 2 },
  colNarrow: { flex: 1 },
  chipRow: { flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  figuresHint: { alignItems: "flex-start", gap: 7, marginTop: 10 },
  figuresHintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  errorText: { fontSize: 13.5, fontFamily: "Inter_500Medium", marginTop: 14 },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 24,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
