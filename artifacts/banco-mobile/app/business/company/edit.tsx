// Company Profile editor — lets a verified business edit its public supplier
// profile (the same CompanyTrade block shown in app/business/company/[id].tsx
// and the suppliers directory). Honesty rules:
//  - role is only a UX hint; the server (getMe/getCompany/updateMyCompany) is
//    authoritative. 401/403 → "become a business" CTA, never a broken form.
//  - company === null means the seller is an individual with no company profile;
//    we show the same CTA, NOT an empty form pretending one exists.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  getMe,
  getCompany,
  updateMyCompany,
  type CompanyTrade,
  type UpdateMyCompanyBody,
  type UpdateMyCompanyBodyIndustry,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

type LoadState = "loading" | "ready" | "error" | "restricted";
type Colors = ReturnType<typeof useColors>;

const INDUSTRIES: UpdateMyCompanyBodyIndustry[] = [
  "food",
  "beverage",
  "plastic",
  "textile",
  "pharmaceutical",
  "chemical",
  "engineering",
  "other",
];

const splitCsv = (s: string): string[] =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const numOrNull = (s: string): number | null => {
  const cleaned = s.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
};

const intOrNull = (s: string): number | null => {
  const cleaned = s.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return isFinite(n) ? n : null;
};

function RestrictedView({
  colors,
  t,
}: {
  colors: Colors;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <View style={styles.stateWrap}>
      <MaterialCommunityIcons
        name="store-outline"
        size={56}
        color={colors.mutedForeground}
      />
      <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
        {t("profile.becomeBusiness")}
      </AppText>
      <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
        {t("profile.becomeBusinessHint")}
      </AppText>
      <Pressable
        onPress={() => router.push("/business/onboarding")}
        style={[
          styles.cta,
          { backgroundColor: colors.primary, borderRadius: colors.radius },
        ]}
        testID="company-edit-become-business"
      >
        <MaterialCommunityIcons
          name="storefront-outline"
          size={16}
          color={colors.primaryForeground}
        />
        <AppText style={[styles.ctaText, { color: colors.primaryForeground }]}>
          {t("profile.becomeBusiness")}
        </AppText>
      </Pressable>
    </View>
  );
}

export default function CompanyEditScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir: "row" | "row-reverse" = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";
  const inputAlign: "left" | "right" = isRTL ? "right" : "left";

  const [state, setState] = useState<LoadState>("loading");
  const [saving, setSaving] = useState(false);

  const [about, setAbout] = useState("");
  const [industry, setIndustry] = useState<UpdateMyCompanyBodyIndustry>("other");
  const [hqCountry, setHqCountry] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [importFrom, setImportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [minOrderUnit, setMinOrderUnit] = useState("");
  const [monthlyCapacity, setMonthlyCapacity] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [certifications, setCertifications] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const prefill = useCallback((c: CompanyTrade) => {
    setAbout(c.about ?? "");
    setIndustry(c.industry as UpdateMyCompanyBodyIndustry);
    setHqCountry(c.hq_country ?? "");
    setYearEstablished(c.year_established != null ? String(c.year_established) : "");
    setWebsiteUrl(c.website_url ?? "");
    setImportFrom((c.countries_import_from ?? []).join(", "));
    setExportTo((c.countries_export_to ?? []).join(", "));
    setMinOrderValue(c.min_order_value ?? "");
    setMinOrderUnit(c.min_order_unit ?? "");
    setMonthlyCapacity(c.monthly_capacity ?? "");
    setLeadTime(c.lead_time_days != null ? String(c.lead_time_days) : "");
    setCertifications((c.certifications ?? []).join(", "));
    setLogoUrl(c.logo_url ?? "");
    setCoverUrl(c.cover_url ?? "");
  }, []);

  const load = useCallback(async () => {
    try {
      const meRes = await getMe();
      const id = meRes.data?.id;
      if (!id) {
        setState("restricted");
        return;
      }
      const compRes = await getCompany(id);
      const company = compRes.data?.company ?? null;
      if (!company) {
        // Individual / no company profile — honest CTA, not an empty form.
        setState("restricted");
        return;
      }
      prefill(company);
      setState("ready");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setState(status === 401 || status === 403 ? "restricted" : "error");
    }
  }, [prefill]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const body: UpdateMyCompanyBody = {
      about: about.trim() || null,
      industry,
      hq_country: hqCountry.trim() || null,
      year_established: intOrNull(yearEstablished),
      website_url: websiteUrl.trim() || null,
      countries_import_from: splitCsv(importFrom),
      countries_export_to: splitCsv(exportTo),
      min_order_value: numOrNull(minOrderValue),
      min_order_unit: minOrderUnit.trim() || null,
      monthly_capacity: monthlyCapacity.trim() || null,
      lead_time_days: intOrNull(leadTime),
      certifications: splitCsv(certifications),
      logo_url: logoUrl.trim() || null,
      cover_url: coverUrl.trim() || null,
    };
    try {
      await updateMyCompany(body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("business.companyEdit.saved"));
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("business.companyEdit.saveError"));
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    about,
    industry,
    hqCountry,
    yearEstablished,
    websiteUrl,
    importFrom,
    exportTo,
    minOrderValue,
    minOrderUnit,
    monthlyCapacity,
    leadTime,
    certifications,
    logoUrl,
    coverUrl,
    t,
  ]);

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: {
      placeholder?: string;
      multiline?: boolean;
      keyboardType?: "default" | "numeric" | "url";
      hint?: string;
      testID?: string;
    },
  ) => (
    <View style={styles.field}>
      <AppText style={[styles.label, { color: colors.foreground, textAlign }]}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={opts?.multiline}
        keyboardType={opts?.keyboardType ?? "default"}
        autoCapitalize={opts?.keyboardType === "url" ? "none" : "sentences"}
        style={[
          styles.input,
          opts?.multiline && styles.inputMultiline,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            textAlign: inputAlign,
          },
        ]}
        testID={opts?.testID}
      />
      {opts?.hint ? (
        <AppText style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
          {opts.hint}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          testID="company-edit-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("business.companyEdit.title")}
        </AppText>
        {state === "ready" ? (
          <Pressable
            onPress={save}
            disabled={saving}
            style={styles.saveBtn}
            hitSlop={12}
            testID="company-edit-save-top"
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="check" size={22} color={colors.primary} />
            )}
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {state === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : state === "restricted" ? (
        <RestrictedView colors={colors} t={t} />
      ) : state === "error" ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.common.loadError")}
          </AppText>
          <Pressable
            onPress={() => {
              setState("loading");
              load();
            }}
            style={[
              styles.cta,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="company-edit-retry"
          >
            <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            <AppText style={[styles.ctaText, { color: colors.primaryForeground }]}>
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AppText
              style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}
            >
              {t("business.companyEdit.subtitle")}
            </AppText>

            <AppText
              style={[styles.section, { color: colors.foreground, textAlign }]}
            >
              {t("business.companyEdit.sectionAbout")}
            </AppText>
            {field(t("business.companyEdit.about"), about, setAbout, {
              placeholder: t("business.companyEdit.aboutPh"),
              multiline: true,
              testID: "company-edit-about",
            })}

            <View style={styles.field}>
              <AppText style={[styles.label, { color: colors.foreground, textAlign }]}>
                {t("business.companyEdit.industry")}
              </AppText>
              <View style={[styles.chips, { flexDirection: rowDir }]}>
                {INDUSTRIES.map((opt) => {
                  const active = opt === industry;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setIndustry(opt);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                          borderRadius: colors.radius,
                        },
                      ]}
                      testID={`company-edit-industry-${opt}`}
                    >
                      <AppText
                        style={[
                          styles.chipText,
                          {
                            color: active
                              ? colors.primaryForeground
                              : colors.foreground,
                          },
                        ]}
                      >
                        {t(`business.companyEdit.industries.${opt}`)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {field(t("business.companyEdit.hqCountry"), hqCountry, setHqCountry, {
              placeholder: t("business.companyEdit.hqCountryPh"),
              testID: "company-edit-hq",
            })}
            {field(
              t("business.companyEdit.yearEstablished"),
              yearEstablished,
              setYearEstablished,
              { keyboardType: "numeric", testID: "company-edit-year" },
            )}
            {field(t("business.companyEdit.website"), websiteUrl, setWebsiteUrl, {
              placeholder: "https://",
              keyboardType: "url",
              testID: "company-edit-website",
            })}

            <AppText
              style={[styles.section, { color: colors.foreground, textAlign }]}
            >
              {t("business.companyEdit.sectionTrade")}
            </AppText>
            {field(t("business.companyEdit.importFrom"), importFrom, setImportFrom, {
              placeholder: t("business.companyEdit.importFromPh"),
              hint: t("business.companyEdit.csvHint"),
              testID: "company-edit-import",
            })}
            {field(t("business.companyEdit.exportTo"), exportTo, setExportTo, {
              placeholder: t("business.companyEdit.exportToPh"),
              hint: t("business.companyEdit.csvHint"),
              testID: "company-edit-export",
            })}
            {field(
              t("business.companyEdit.minOrderValue"),
              minOrderValue,
              setMinOrderValue,
              { keyboardType: "numeric", testID: "company-edit-moqv" },
            )}
            {field(
              t("business.companyEdit.minOrderUnit"),
              minOrderUnit,
              setMinOrderUnit,
              {
                placeholder: t("business.companyEdit.minOrderUnitPh"),
                testID: "company-edit-moqu",
              },
            )}
            {field(
              t("business.companyEdit.monthlyCapacity"),
              monthlyCapacity,
              setMonthlyCapacity,
              {
                placeholder: t("business.companyEdit.monthlyCapacityPh"),
                testID: "company-edit-capacity",
              },
            )}
            {field(t("business.companyEdit.leadTime"), leadTime, setLeadTime, {
              keyboardType: "numeric",
              testID: "company-edit-leadtime",
            })}
            {field(
              t("business.companyEdit.certifications"),
              certifications,
              setCertifications,
              {
                placeholder: t("business.companyEdit.certificationsPh"),
                hint: t("business.companyEdit.csvHint"),
                testID: "company-edit-certs",
              },
            )}
            {field(t("business.companyEdit.logoUrl"), logoUrl, setLogoUrl, {
              placeholder: "https://",
              keyboardType: "url",
              testID: "company-edit-logo",
            })}
            {field(t("business.companyEdit.coverUrl"), coverUrl, setCoverUrl, {
              placeholder: "https://",
              keyboardType: "url",
              testID: "company-edit-cover",
            })}

            <Pressable
              onPress={save}
              disabled={saving}
              style={[
                styles.saveFull,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
              ]}
              testID="company-edit-save"
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="check" size={18} color={colors.primaryForeground} />
                  <AppText
                    style={[styles.saveFullText, { color: colors.primaryForeground }]}
                  >
                    {t("business.companyEdit.save")}
                  </AppText>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  saveBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  stateTitle: {
    fontSize: 19,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
    textAlign: "center",
  },
  stateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  ctaText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, paddingBottom: 140 },
  subtitle: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 8,
  },
  section: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginTop: 18,
    marginBottom: 4,
  },
  field: { marginTop: 12, gap: 6 },
  label: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top", paddingTop: 10 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  chips: { flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 24,
  },
  saveFullText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
