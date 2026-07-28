import { Feather, Ionicons } from "@/components/icons";
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export type RationaleConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  bullets?: string[];
  confirmLabel?: string;
};

type Props = {
  visible: boolean;
  config: RationaleConfig;
  onAcknowledge: () => void;
  onCancel: () => void;
};

/**
 * Reusable permission-rationale screen shown BEFORE any OS camera/gallery
 * prompt fires (Google Play prominent-disclosure requirement). The OS prompt
 * must only be triggered from the `onAcknowledge` handler.
 */
export function PermissionRationaleModal({
  visible,
  config,
  onAcknowledge,
  onCancel,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 4,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.primary + "18", borderRadius: 999 },
            ]}
          >
            <Ionicons name={config.icon} size={28} color={colors.primary} />
          </View>

          <AppText style={[styles.title, { color: colors.foreground }]}>
            {config.title}
          </AppText>
          <AppText style={[styles.message, { color: colors.mutedForeground }]}>
            {config.message}
          </AppText>

          {config.bullets && config.bullets.length > 0 && (
            <View style={styles.bullets}>
              {config.bullets.map((b) => (
                <View
                  key={b}
                  style={[
                    styles.bulletRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <Feather name="check" size={15} color={colors.primary} />
                  <AppText
                    style={[styles.bulletText, { color: colors.foreground }]}
                  >
                    {b}
                  </AppText>
                </View>
              ))}
            </View>
          )}

          <Pressable
            onPress={onAcknowledge}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="rationale-acknowledge"
          >
            <AppText
              style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
            >
              {config.confirmLabel ?? t("common.continue")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={styles.cancelBtn}
            testID="rationale-cancel"
          >
            <AppText style={[styles.cancelText, { color: colors.mutedForeground }]}>
              {t("common.notNow")}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  bullets: {
    alignSelf: "stretch",
    gap: 10,
    marginBottom: 20,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  primaryBtn: {
    alignSelf: "stretch",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
