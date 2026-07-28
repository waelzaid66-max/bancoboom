import { Feather } from "@/components/icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PHONE_COUNTRIES } from "@/constants/countryCodes";
import { CURRENCY_BY_MARKET, MARKET_COUNTRIES } from "@/constants/listingCreateTaxonomy";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { marketCountryLabel } from "@/lib/searchTaxonomy";

export type MarketCountryOption = {
  value: string;
  en: string;
  ar: string;
  flag?: string;
};

/** Searchable world list: launch markets first, then every dial-code country. */
export function buildMarketCountryOptions(): MarketCountryOption[] {
  const seen = new Set<string>();
  const out: MarketCountryOption[] = [];
  for (const m of MARKET_COUNTRIES) {
    seen.add(m.value);
    const phone = PHONE_COUNTRIES.find((c) => c.iso === m.value);
    out.push({
      value: m.value,
      en: m.en,
      ar: m.ar,
      flag: phone?.flag,
    });
  }
  for (const c of PHONE_COUNTRIES) {
    if (seen.has(c.iso)) continue;
    seen.add(c.iso);
    out.push({
      value: c.iso,
      en: c.nameEn,
      ar: c.nameAr,
      flag: c.flag,
    });
  }
  return out;
}

const ALL_OPTIONS = buildMarketCountryOptions();

interface MarketCountryPickerProps {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (iso: string) => void;
}

export function MarketCountryPicker({
  visible,
  selected,
  onClose,
  onSelect,
}: MarketCountryPickerProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_OPTIONS;
    return ALL_OPTIONS.filter(
      (c) =>
        c.en.toLowerCase().includes(q) ||
        c.ar.includes(query.trim()) ||
        c.value.toLowerCase().includes(q),
    );
  }, [query]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={[styles.header, { flexDirection: rowDir }]}>
            <View style={styles.headerBtn} />
            <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
              {t("search.marketCountryTitle")}
            </AppText>
            <Pressable onPress={handleClose} hitSlop={10} style={styles.headerBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <View
            style={[
              styles.searchBox,
              {
                flexDirection: rowDir,
                backgroundColor: colors.secondary,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("search.marketCountrySearch")}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.searchInput,
                { color: colors.foreground, textAlign },
              ]}
              testID="market-country-search"
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Feather
                  name="x-circle"
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {results.length > 0 ? (
              results.map((c) => {
                const active = c.value === selected;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => {
                      setQuery("");
                      onSelect(c.value);
                    }}
                    style={[
                      styles.row,
                      {
                        flexDirection: rowDir,
                        borderBottomColor: colors.border,
                      },
                    ]}
                    testID={`market-country-${c.value}`}
                  >
                    {c.flag ? (
                      <AppText style={styles.flag}>{c.flag}</AppText>
                    ) : (
                      <Feather
                        name="globe"
                        size={18}
                        color={colors.mutedForeground}
                      />
                    )}
                    <AppText
                      style={[
                        styles.rowLabel,
                        {
                          color: active ? colors.primary : colors.foreground,
                          textAlign,
                          fontFamily: active
                            ? "Inter_600SemiBold"
                            : "Inter_400Regular",
                        },
                      ]}
                    >
                      {isRTL ? c.ar : c.en}
                    </AppText>
                    <AppText
                      style={[styles.iso, { color: colors.mutedForeground }]}
                    >
                      {c.value}
                    </AppText>
                    {active ? (
                      <Feather name="check" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })
            ) : (
              <AppText
                style={[styles.empty, { color: colors.mutedForeground }]}
              >
                {t("countryPicker.noResults")}
              </AppText>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Compact trigger shown in search chrome (replaces endless country chips). */
export function MarketCountryButton({
  selected,
  onPress,
}: {
  selected: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const rowDir = isRTL ? "row-reverse" : "row";
  const opt = ALL_OPTIONS.find((c) => c.value === selected);
  const label = opt
    ? isRTL
      ? opt.ar
      : opt.en
    : marketCountryLabel(selected, isRTL);
  // Currency rides in the same icon (owner: currency is display/valuation in the
  // market's money, NOT a search filter). Follows the market — never chosen alone.
  const currency = CURRENCY_BY_MARKET[selected] ?? "";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.trigger,
        {
          flexDirection: rowDir,
          backgroundColor: colors.secondary,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
      testID="search-market-country-btn"
      accessibilityLabel={t("search.marketCountryTitle")}
    >
      {/* Flag + short country label + chevron — owner visual contract. Do not
          strip the label again (compact flag-only looked "destroyed"). */}
      {opt?.flag ? (
        <AppText style={styles.triggerFlag}>{opt.flag}</AppText>
      ) : (
        <Feather name="globe" size={16} color={colors.foreground} />
      )}
      <AppText
        style={[styles.triggerLabel, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {currency ? (
        <AppText style={[styles.triggerCurrency, { color: colors.primary }]}>
          {currency}
        </AppText>
      ) : null}
      <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "82%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerBtn: { width: 40, alignItems: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  list: { flex: 1, paddingHorizontal: 8 },
  row: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flag: { fontSize: 22 },
  rowLabel: { flex: 1, fontSize: 15 },
  iso: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  trigger: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
  },
  triggerFlag: { fontSize: 16 },
  triggerLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  triggerCurrency: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
