import { Feather } from "@/components/icons";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import type { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;

// Shared, self-contained destructive-confirmation modal used by both the
// profile and settings screens. The professional gate is DEVICE AUTHENTICATION
// (Face ID / fingerprint / device passcode) — a real identity check that also
// covers passwordless (Google/Apple) accounts. The typed-keyword input remains
// only as the fallback when the device has no auth hardware/enrollment.
export function DeleteAccountModal({
  visible,
  deleting,
  colors,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  deleting: boolean;
  colors: Colors;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t, isRTL } = useI18n();
  const [confirmText, setConfirmText] = useState("");
  const [authing, setAuthing] = useState(false);
  // Device auth availability (null while probing). Web has no LocalAuthentication.
  const [deviceAuth, setDeviceAuth] = useState<boolean | null>(null);
  const keyword = t("profile.deleteKeyword");
  const isMatch =
    confirmText.trim().toLocaleUpperCase() === keyword.toLocaleUpperCase();
  const canDelete = (deviceAuth === true || isMatch) && !deleting && !authing;

  useEffect(() => {
    if (!visible) {
      setConfirmText("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === "web") {
          if (!cancelled) setDeviceAuth(false);
          return;
        }
        const hw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = hw && (await LocalAuthentication.isEnrolledAsync());
        // securityLevel > NONE means at least a device passcode exists.
        const level = await LocalAuthentication.getEnrolledLevelAsync();
        if (!cancelled)
          setDeviceAuth(enrolled || level > LocalAuthentication.SecurityLevel.NONE);
      } catch {
        if (!cancelled) setDeviceAuth(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Device-auth path: prove identity (biometrics, falling back to the device
  // passcode) IMMEDIATELY before the irreversible call.
  const confirmWithAuth = async () => {
    if (deviceAuth !== true) {
      onConfirm();
      return;
    }
    setAuthing(true);
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t("profile.deleteAuthPrompt"),
      });
      if (res.success) onConfirm();
    } catch {
      // Auth errored — do nothing; the user can retry or cancel.
    } finally {
      setAuthing(false);
    }
  };

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
              { backgroundColor: colors.destructive + "18" },
            ]}
          >
            <Feather name="alert-triangle" size={28} color={colors.destructive} />
          </View>
          <AppText style={[styles.title, { color: colors.foreground }]}>
            {t("profile.deleteTitle")}
          </AppText>
          <AppText style={[styles.message, { color: colors.mutedForeground }]}>
            {t("profile.deleteMessage")}
          </AppText>
          <View style={styles.bullets}>
            {[
              t("profile.deleteBullet1"),
              t("profile.deleteBullet2"),
              t("profile.deleteBullet3"),
            ].map((b) => (
              <View
                key={b}
                style={[styles.bulletRow, isRTL && styles.rowReverse]}
              >
                <Feather name="x" size={14} color={colors.destructive} />
                <AppText
                  style={[
                    styles.bulletText,
                    {
                      color: colors.foreground,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                >
                  {b}
                </AppText>
              </View>
            ))}
          </View>

          {deviceAuth !== true ? (
            <View style={styles.field}>
              <AppText
                style={[
                  styles.prompt,
                  {
                    color: colors.mutedForeground,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {t("profile.deletePrompt")}
              </AppText>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder={keyword}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!deleting}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.secondary,
                    color: colors.foreground,
                    borderColor: isMatch ? colors.destructive : colors.border,
                    borderRadius: colors.radius,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                testID="delete-confirm-input"
              />
            </View>
          ) : (
            <View style={[styles.authHintRow, isRTL && styles.rowReverse]}>
              <Feather name="lock" size={14} color={colors.mutedForeground} />
              <AppText style={[styles.authHint, { color: colors.mutedForeground }]}>
                {t("profile.deleteAuthPrompt")}
              </AppText>
            </View>
          )}

          <Pressable
            onPress={confirmWithAuth}
            disabled={!canDelete}
            style={[
              styles.deleteBtn,
              {
                backgroundColor: colors.destructive,
                borderRadius: colors.radius,
                opacity: canDelete ? 1 : 0.5,
              },
            ]}
            testID="confirm-delete-account"
          >
            {deleting || authing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <AppText style={styles.deleteText}>
                {t("profile.deleteConfirm")}
              </AppText>
            )}
          </Pressable>
          <Pressable
            onPress={onCancel}
            disabled={deleting}
            style={styles.cancelBtn}
          >
            <AppText style={[styles.cancelText, { color: colors.foreground }]}>
              {t("common.cancel")}
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
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
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
  bullets: { alignSelf: "stretch", gap: 8, marginBottom: 18 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  rowReverse: { flexDirection: "row-reverse" },
  field: { alignSelf: "stretch", marginBottom: 16 },
  authHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  authHint: { fontSize: 12.5, fontFamily: "Inter_500Medium" },
  prompt: { fontSize: 12.5, fontFamily: "Inter_500Medium", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  deleteBtn: {
    alignSelf: "stretch",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  deleteText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  cancelBtn: { alignSelf: "stretch", paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
