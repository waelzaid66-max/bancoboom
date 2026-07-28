// Structured "Request Better Price" form. Non-chat procurement: the buyer
// states what they need + budget; suppliers respond with ranked offers. The
// monthly-target note is folded into description text (no monthly field on the
// RFQ contract). All amounts entered as plain numbers; no client math.
import { Feather } from "@/components/icons";
import { useUser } from "@clerk/expo";
import {
  CreateRfqBody,
  CreateRfqBodyCategory,
  CreateRfqBodyIndustrialType,
  CreateRfqBodyIndustry,
  useCreateRfq,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
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

const CATEGORIES: { value: CreateRfqBodyCategory; labelKey: string }[] = [
  { value: "industrial", labelKey: "rfq.cat.industrial" },
  { value: "car", labelKey: "rfq.cat.car" },
  { value: "real_estate", labelKey: "rfq.cat.real_estate" },
];

const INDUSTRIES: CreateRfqBodyIndustry[] = [
  "food",
  "beverage",
  "plastic",
  "textile",
  "pharmaceutical",
  "chemical",
  "engineering",
  "other",
];

const INDUSTRIAL_TYPES: CreateRfqBodyIndustrialType[] = [
  "factory",
  "warehouse",
  "machine",
  "production_line",
  "land",
  "raw_material",
];

export default function CreateRfqScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "right" | "left" = isRTL ? "right" : "left";
  const writeDir: "rtl" | "ltr" = isRTL ? "rtl" : "ltr";

  const { isSignedIn, isLoaded } = useUser();
  const params = useLocalSearchParams<{
    category?: string;
    industrial_type?: string;
    title?: string;
  }>();

  const initialCategory = CATEGORIES.some((c) => c.value === params.category)
    ? (params.category as CreateRfqBodyCategory)
    : "industrial";

  const [title, setTitle] = useState(params.title ?? "");
  const [description, setDescription] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [category, setCategory] = useState<CreateRfqBodyCategory>(initialCategory);
  const [industry, setIndustry] = useState<CreateRfqBodyIndustry | null>(null);
  const [industrialType, setIndustrialType] = useState<CreateRfqBodyIndustrialType | null>(
    INDUSTRIAL_TYPES.includes(params.industrial_type as CreateRfqBodyIndustrialType)
      ? (params.industrial_type as CreateRfqBodyIndustrialType)
      : null,
  );
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [budget, setBudget] = useState("");
  const [destination, setDestination] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateRfq();

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
        testID="rfq-create-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("rfq.createTitle")}
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
            {t("rfq.signInRequired")}
          </AppText>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="rfq-create-go-profile"
          >
            <AppText style={[styles.submitText, { color: colors.primaryForeground }]}>
              {t("rfq.goToProfile")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      setError(t("rfq.errTitle"));
      return;
    }
    setError(null);

    const descParts: string[] = [];
    if (description.trim()) descParts.push(description.trim());
    if (monthlyTarget.trim()) {
      descParts.push(`${t("rfq.fMonthlyTarget")}: ${monthlyTarget.trim()}`);
    }

    const body: CreateRfqBody = { title: title.trim(), category };
    if (descParts.length > 0) body.description = descParts.join("\n\n");

    const qn = Number(quantity);
    if (quantity.trim() && !Number.isNaN(qn)) body.quantity = qn;
    if (unit.trim()) body.unit = unit.trim();
    const bn = Number(budget);
    if (budget.trim() && !Number.isNaN(bn)) body.target_price_max = bn;
    if (destination.trim()) body.destination_country = destination.trim();
    if (deadline.trim()) body.deadline = deadline.trim();
    if (category === "industrial") {
      if (industry) body.industry = industry;
      if (industrialType) body.industrial_type = industrialType;
    }

    mutate(
      { data: body },
      {
        onSuccess: (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const newId = res.data?.id;
          if (newId) router.replace(`/rfq/${newId}`);
          else router.replace("/rfq");
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(t("rfq.errSubmit"));
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
        <FieldLabel label={t("rfq.fTitle")} colors={colors} textAlign={textAlign} />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t("rfq.fTitlePh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="rfq-field-title"
        />

        <FieldLabel
          label={t("rfq.fCategory")}
          colors={colors}
          textAlign={textAlign}
        />
        <ChipRow
          options={CATEGORIES.map((c) => ({ value: c.value, label: t(c.labelKey) }))}
          selected={category}
          onSelect={(v) => setCategory(v as CreateRfqBodyCategory)}
          colors={colors}
          rowDir={rowDir}
        />

        {category === "industrial" && (
          <>
            <FieldLabel
              label={t("rfq.fType")}
              tag={t("rfq.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <ChipRow
              options={INDUSTRIAL_TYPES.map((v) => ({ value: v, label: t(`rfq.it.${v}`) }))}
              selected={industrialType}
              onSelect={(v) =>
                setIndustrialType((prev) =>
                  prev === v ? null : (v as CreateRfqBodyIndustrialType),
                )
              }
              colors={colors}
              rowDir={rowDir}
            />

            <FieldLabel
              label={t("rfq.fIndustry")}
              tag={t("rfq.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <ChipRow
              options={INDUSTRIES.map((v) => ({ value: v, label: t(`rfq.ind.${v}`) }))}
              selected={industry}
              onSelect={(v) =>
                setIndustry((prev) =>
                  prev === v ? null : (v as CreateRfqBodyIndustry),
                )
              }
              colors={colors}
              rowDir={rowDir}
            />
          </>
        )}

        <View style={[styles.twoCol, { flexDirection: rowDir }]}>
          <View style={styles.col}>
            <FieldLabel
              label={t("rfq.fQuantity")}
              tag={t("rfq.optional")}
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
              testID="rfq-field-quantity"
            />
          </View>
          <View style={styles.col}>
            <FieldLabel
              label={t("rfq.fUnit")}
              tag={t("rfq.optional")}
              colors={colors}
              textAlign={textAlign}
            />
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder={t("rfq.fUnitPh")}
              placeholderTextColor={colors.mutedForeground}
              style={inputStyle}
              testID="rfq-field-unit"
            />
          </View>
        </View>

        <FieldLabel
          label={t("rfq.fBudget")}
          tag={t("rfq.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={budget}
          onChangeText={setBudget}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          style={inputStyle}
          testID="rfq-field-budget"
        />

        <FieldLabel
          label={t("rfq.fMonthlyTarget")}
          tag={t("rfq.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={monthlyTarget}
          onChangeText={setMonthlyTarget}
          placeholder={t("rfq.fMonthlyTargetPh")}
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          style={inputStyle}
          testID="rfq-field-monthly"
        />

        <FieldLabel
          label={t("rfq.fDestination")}
          tag={t("rfq.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder={t("rfq.fDestinationPh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="rfq-field-destination"
        />

        <FieldLabel
          label={t("rfq.fDeadline")}
          tag={t("rfq.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={deadline}
          onChangeText={setDeadline}
          placeholder={t("rfq.fDeadlinePh")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="rfq-field-deadline"
        />

        <FieldLabel
          label={t("rfq.fDescription")}
          tag={t("rfq.optional")}
          colors={colors}
          textAlign={textAlign}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("rfq.fDescriptionPh")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[...inputStyle, styles.textArea]}
          testID="rfq-field-description"
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
          testID="rfq-submit"
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <AppText style={[styles.submitText, { color: colors.primaryForeground }]}>
              {t("rfq.submit")}
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
            testID={`rfq-chip-${opt.value}`}
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
  textArea: { minHeight: 100, paddingTop: 12, textAlignVertical: "top" },
  twoCol: { gap: 12 },
  col: { flex: 1 },
  chipRow: { flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  errorText: { fontSize: 13.5, fontFamily: "Inter_500Medium", marginTop: 14 },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 24,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
