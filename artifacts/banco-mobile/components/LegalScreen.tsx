import { Feather } from "@/components/icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export type LegalSection = {
  heading: string;
  body: string;
  highlight?: boolean;
};

type Props = {
  title: string;
  updated: string;
  sections: LegalSection[];
};

export function LegalScreen({ title, updated, sections }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const align = isRTL ? "right" : "left";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
          isRTL && styles.headerRTL,
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          testID="legal-back"
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.foreground}
          />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {title}
        </AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText
          style={[styles.updated, { color: colors.mutedForeground, textAlign: align }]}
        >
          {t("profile.lastUpdated", { date: updated })}
        </AppText>

        {sections.map((s) => (
          <View
            key={s.heading}
            style={[
              styles.section,
              s.highlight && {
                backgroundColor: colors.primary + "12",
                borderColor: colors.primary + "40",
                borderWidth: 1,
                borderRadius: colors.radius,
                padding: 16,
              },
            ]}
          >
            <AppText
              style={[
                styles.sectionHeading,
                {
                  color: s.highlight ? colors.primary : colors.foreground,
                  textAlign: align,
                },
              ]}
            >
              {s.heading}
            </AppText>
            <AppText
              style={[
                styles.sectionBody,
                { color: colors.mutedForeground, textAlign: align },
              ]}
            >
              {s.body}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRTL: { flexDirection: "row-reverse" },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 60, gap: 20 },
  updated: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { gap: 8 },
  sectionHeading: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
});
