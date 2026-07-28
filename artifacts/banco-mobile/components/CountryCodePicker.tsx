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
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import {
  PHONE_COUNTRIES,
  countryLabel,
  type PhoneCountry,
} from "@/constants/countryCodes";

interface CountryCodePickerProps {
  visible: boolean;
  selectedIso?: string;
  onClose: () => void;
  onSelect: (iso: string) => void;
}

export function CountryCodePicker({
  visible,
  selectedIso,
  onClose,
  onSelect,
}: CountryCodePickerProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.includes(query.trim()) ||
        c.dial.includes(q.replace(/[^0-9]/g, "")),
    );
  }, [query]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const pick = (c: PhoneCountry) => {
    setQuery("");
    onSelect(c.iso);
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
              {t("countryPicker.title")}
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
              placeholder={t("countryPicker.searchPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground, textAlign }]}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Feather name="x-circle" size={16} color={colors.mutedForeground} />
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
                const active = c.iso === selectedIso;
                return (
                  <Pressable
                    key={c.iso}
                    onPress={() => pick(c)}
                    style={[
                      styles.row,
                      { flexDirection: rowDir, borderBottomColor: colors.border },
                    ]}
                  >
                    <AppText style={styles.flag}>{c.flag}</AppText>
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
                      {countryLabel(c, isRTL)}
                    </AppText>
                    <AppText
                      style={[styles.dial, { color: colors.mutedForeground }]}
                    >
                      +{c.dial}
                    </AppText>
                    {active ? (
                      <Feather name="check" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })
            ) : (
              <AppText style={[styles.empty, { color: colors.mutedForeground }]}>
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "center",
  },
  searchBox: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  list: { flex: 1 },
  row: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flag: { fontSize: 22 },
  rowLabel: { fontSize: 14.5, flex: 1 },
  dial: { fontSize: 14, fontFamily: "Inter_500Medium" },
  empty: { textAlign: "center", paddingVertical: 32, fontSize: 14 },
});
