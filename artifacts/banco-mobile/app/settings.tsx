import { Feather } from "@/components/icons";
import { useAuth, useSignIn, useUser } from "@clerk/expo";
import {
  deleteAccount,
  getGetMyNotificationPreferencesQueryKey,
  setMyNotificationPreferences,
  useGetMyNotificationPreferences,
  type NotificationPreference,
  type NotificationPreferenceType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { useBiometric } from "@/context/BiometricContext";
import { useI18n } from "@/context/LanguageContext";
import { useSound } from "@/context/SoundContext";
import { useThemeMode } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;

const SUPPORT_EMAIL = "support@banco.today";

const CATEGORY_ORDER: NotificationPreferenceType[] = [
  "lead",
  "message",
  "booking",
  "rfq",
  "comment",
  "review",
  "new_match",
  "price_drop",
  "investment",
  "global_supply",
  "system",
];

function SectionTitle({
  label,
  colors,
  isRTL,
  marginTop = 28,
}: {
  label: string;
  colors: Colors;
  isRTL: boolean;
  marginTop?: number;
}) {
  return (
    <AppText
      style={[
        styles.sectionTitle,
        { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left", marginTop },
      ]}
    >
      {label}
    </AppText>
  );
}

function InfoRow({
  icon,
  title,
  body,
  colors,
  isRTL,
  trailing,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  body: string;
  colors: Colors;
  isRTL: boolean;
  trailing?: string;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: colors.border },
      ]}
    >
      <Feather name={icon} size={18} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <AppText
          style={[styles.infoTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
        >
          {title}
        </AppText>
        <AppText
          style={[styles.infoBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
        >
          {body}
        </AppText>
      </View>
      {trailing ? (
        <AppText style={[styles.trailing, { color: colors.mutedForeground }]}>{trailing}</AppText>
      ) : null}
    </View>
  );
}

function LinkRow({
  icon,
  label,
  hint,
  onPress,
  colors,
  isRTL,
  danger,
  busy,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  hint?: string;
  onPress: () => void;
  colors: Colors;
  isRTL: boolean;
  danger?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  const tint = danger ? colors.destructive : colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.linkRow, { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: colors.border }]}
      testID={testID}
    >
      <Feather name={icon} size={18} color={tint} />
      <View style={{ flex: 1 }}>
        <AppText style={[styles.linkLabel, { color: tint, textAlign: isRTL ? "right" : "left" }]}>
          {label}
        </AppText>
        {hint ? (
          <AppText
            style={[styles.linkHint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
          >
            {hint}
          </AppText>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      ) : (
        <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

function SegmentRow({
  icon,
  label,
  hint,
  options,
  value,
  onChange,
  colors,
  isRTL,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colors: Colors;
  isRTL: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.segmentRow, { borderBottomColor: colors.border }]}>
      <View
        style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}
      >
        <Feather name={icon} size={18} color={colors.mutedForeground} />
        <View style={{ flex: 1 }}>
          <AppText
            style={[styles.linkLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
          >
            {label}
          </AppText>
          {hint ? (
            <AppText
              style={[styles.linkHint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
            >
              {hint}
            </AppText>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.segmentTrack,
          { flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius },
        ]}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.segmentBtn,
                { borderRadius: colors.radius - 2 },
                active && { backgroundColor: colors.primary },
              ]}
              testID={testID ? `${testID}-${opt.value}` : undefined}
            >
              <AppText
                style={[styles.segmentText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}
              >
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  body,
  value,
  onValueChange,
  disabled,
  colors,
  isRTL,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  body: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  colors: Colors;
  isRTL: boolean;
  testID?: string;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        { flexDirection: isRTL ? "row-reverse" : "row", borderBottomColor: colors.border, alignItems: "center" },
      ]}
    >
      <Feather name={icon} size={18} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <AppText
          style={[styles.infoTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
        >
          {title}
        </AppText>
        <AppText
          style={[styles.infoBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
        >
          {body}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#ffffff"
        testID={testID}
      />
    </View>
  );
}

function PasswordField({
  value,
  onChangeText,
  placeholder,
  reveal,
  onToggleReveal,
  editable,
  colors,
  isRTL,
  showLabel,
  hideLabel,
  testID,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  reveal: boolean;
  onToggleReveal: () => void;
  editable: boolean;
  colors: Colors;
  isRTL: boolean;
  showLabel: string;
  hideLabel: string;
  testID?: string;
}) {
  return (
    <View style={styles.pwFieldWrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={!reveal}
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.modalInput,
          {
            backgroundColor: colors.secondary,
            color: colors.foreground,
            borderColor: colors.border,
            borderRadius: colors.radius,
            textAlign: isRTL ? "right" : "left",
            marginBottom: 0,
            paddingLeft: isRTL ? 44 : 14,
            paddingRight: isRTL ? 14 : 44,
          },
        ]}
        testID={testID}
      />
      <Pressable
        onPress={onToggleReveal}
        hitSlop={10}
        style={[styles.eyeBtn, isRTL ? { left: 8 } : { right: 8 }]}
        accessibilityLabel={reveal ? hideLabel : showLabel}
        testID={testID ? `${testID}-eye` : undefined}
      >
        <Feather name={reveal ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { t, isRTL, lang, setLang } = useI18n();
  const { mode, setMode } = useThemeMode();
  const {
    soundEnabled,
    notificationsEnabled,
    setSoundEnabled,
    setNotificationsEnabled,
  } = useSound();
  const biometric = useBiometric();
  const insets = useSafeAreaInsets();
  const { isSignedIn, signOut, sessionId } = useAuth();
  const { user } = useUser();
  const { signIn } = useSignIn();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 12 : insets.top;
  const rowDir: "row" | "row-reverse" = isRTL ? "row-reverse" : "row";

  const query = useGetMyNotificationPreferences({
    query: {
      queryKey: getGetMyNotificationPreferencesQueryKey(),
      enabled: !!isSignedIn,
    },
  });

  const [prefs, setPrefs] = useState<NotificationPreference[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Active devices (Clerk sessions)
  const [otherSessions, setOtherSessions] = useState<number | null>(null);
  const [sessionsBusy, setSessionsBusy] = useState(false);

  // Change password (Clerk)
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [revealCurrent, setRevealCurrent] = useState(false);
  const [revealNew, setRevealNew] = useState(false);
  const [revealConfirm, setRevealConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Email change — two-step Clerk flow: create + verify by code, then promote
  // to primary. The pending EmailAddressResource is held across the two steps.
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState<"input" | "verify">("input");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const pendingEmailRef = useRef<
    NonNullable<typeof user>["emailAddresses"][number] | null
  >(null);

  // Delete account — password-gated for password accounts; the typed-DELETE
  // modal is the fallback only for SSO-only accounts that have no password.
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [revealDeletePw, setRevealDeletePw] = useState(false);
  const [deletePwError, setDeletePwError] = useState<string | null>(null);
  const [deletePwBusy, setDeletePwBusy] = useState(false);

  useEffect(() => {
    const data = query.data?.data;
    if (data) setPrefs(data);
  }, [query.data]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user
      .getSessions()
      .then((sessions) => {
        if (cancelled) return;
        setOtherSessions(sessions.filter((s) => s.id !== sessionId).length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, sessionId]);

  const togglePref = async (type: NotificationPreferenceType, channel: "in_app" | "email") => {
    if (!prefs || saving) return;
    Haptics.selectionAsync().catch(() => {});
    const previous = prefs;
    const next = prefs.map((p) =>
      p.type === type ? { ...p, [channel]: !p[channel] } : p,
    );
    setPrefs(next);
    setSaving(true);
    try {
      await setMyNotificationPreferences({ preferences: next });
      queryClient.invalidateQueries({ queryKey: getGetMyNotificationPreferencesQueryKey() });
    } catch {
      setPrefs(previous);
      Alert.alert(t("settings.saveErrorTitle"), t("settings.saveErrorBody"));
    } finally {
      setSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(t("settings.signOut"), t("settings.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOut"),
        style: "destructive",
        onPress: () => {
          signOut().catch(() => {});
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const signOutOtherDevices = async () => {
    if (!user || !sessionId || sessionsBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSessionsBusy(true);
    try {
      const sessions = await user.getSessions();
      await Promise.all(
        sessions.filter((s) => s.id !== sessionId).map((s) => s.revoke()),
      );
      setOtherSessions(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("settings.sessionsSignedOut"));
    } catch {
      Alert.alert(t("settings.sessionsErrorTitle"), t("settings.sessionsErrorBody"));
    } finally {
      setSessionsBusy(false);
    }
  };

  const submitPassword = async () => {
    if (!user || pwSaving) return;
    if (newPw.length < 8) {
      setPwError(t("settings.passwordTooShort"));
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(t("settings.passwordMismatch"));
      return;
    }
    setPwError(null);
    setPwSaving(true);
    try {
      await user.updatePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        signOutOfOtherSessions: true,
      });
      setShowPwModal(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setRevealCurrent(false);
      setRevealNew(false);
      setRevealConfirm(false);
      setOtherSessions(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("settings.passwordUpdated"));
    } catch {
      setPwError(t("settings.passwordErrorBody"));
    } finally {
      setPwSaving(false);
    }
  };

  const closeEmailModal = () => {
    // Backing out mid-flow leaves a created-but-unverified address on the Clerk
    // account — best-effort remove it. The success path nulls the ref first
    // (it's now the primary email), so this never touches a live address.
    pendingEmailRef.current?.destroy().catch(() => {});
    pendingEmailRef.current = null;
    setShowEmailModal(false);
    setEmailStep("input");
    setNewEmail("");
    setEmailCode("");
    setEmailError(null);
  };

  const startEmailChange = async () => {
    if (!user || emailSaving) return;
    const trimmed = newEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setEmailError(t("settings.emailInvalid"));
      return;
    }
    if (trimmed.toLowerCase() === email.toLowerCase()) {
      setEmailError(t("settings.emailSameAsCurrent"));
      return;
    }
    setEmailError(null);
    setEmailSaving(true);
    try {
      const created = await user.createEmailAddress({ email: trimmed });
      await created.prepareVerification({ strategy: "email_code" });
      pendingEmailRef.current = created;
      setEmailStep("verify");
    } catch {
      setEmailError(t("settings.emailError"));
    } finally {
      setEmailSaving(false);
    }
  };

  const verifyEmailChange = async () => {
    if (!user || emailSaving) return;
    const created = pendingEmailRef.current;
    if (!created) return;
    if (!emailCode.trim()) {
      setEmailError(t("settings.emailCodeRequired"));
      return;
    }
    setEmailError(null);
    setEmailSaving(true);
    try {
      const verified = await created.attemptVerification({
        code: emailCode.trim(),
      });
      if (verified.verification?.status !== "verified") {
        setEmailError(t("settings.emailCodeInvalid"));
        return;
      }
      // Promote the freshly verified address to primary, then best-effort
      // remove the old one so the account keeps a single email.
      await user.update({ primaryEmailAddressId: created.id });
      await Promise.all(
        user.emailAddresses
          .filter((e) => e.id !== created.id)
          .map((e) => e.destroy().catch(() => {})),
      );
      await user.reload().catch(() => {});
      // The pending address is now the verified primary; drop the ref before
      // closing so the cleanup in closeEmailModal can't destroy a live email.
      pendingEmailRef.current = null;
      closeEmailModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("settings.emailUpdated"));
    } catch {
      setEmailError(t("settings.emailCodeInvalid"));
    } finally {
      setEmailSaving(false);
    }
  };

  const handleDelete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      setDeleting(true);
      await deleteAccount();
      setShowDelete(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signOut();
      router.replace("/(tabs)");
    } catch {
      setDeleting(false);
      Alert.alert(t("settings.deleteErrorTitle"), t("settings.deleteErrorBody"));
    }
  };

  // Verifies the account password (via a non-finalized sign-in attempt, so the
  // active session is never switched) before permanently deleting the account.
  const verifyAndDelete = async () => {
    if (deletePwBusy) return;
    if (!deletePw) {
      setDeletePwError(t("settings.deletePasswordRequired"));
      return;
    }
    if (!signIn) return;
    setDeletePwError(null);
    setDeletePwBusy(true);
    // Step 1: verify the password. A failure here means the password is wrong.
    try {
      const { error } = await signIn.password({
        emailAddress: email,
        password: deletePw,
      });
      if (error || signIn.status !== "complete") {
        setDeletePwError(t("settings.deleteWrongPassword"));
        setDeletePwBusy(false);
        return;
      }
    } catch {
      setDeletePwError(t("settings.deleteWrongPassword"));
      setDeletePwBusy(false);
      return;
    }
    // Step 2: password is correct — perform the deletion. A failure here is a
    // deletion error, not a wrong-password error, so report it separately.
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await deleteAccount();
      setShowDeletePw(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signOut();
      router.replace("/(tabs)");
    } catch {
      setDeletePwError(t("settings.deleteFailed"));
      setDeletePwBusy(false);
    }
  };

  const onToggleBiometric = async (next: boolean) => {
    if (next && !biometric.supported) {
      Alert.alert(t("settings.biometricTitle"), t("settings.biometricUnavailable"));
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    const ok = await biometric.setEnabled(next);
    if (next && !ok) {
      Alert.alert(t("settings.biometricTitle"), t("settings.biometricFailed"));
    }
  };

  const openMail = (subject: string) => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`,
    ).catch(() => {});
  };

  const Header = (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 8,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
          flexDirection: rowDir,
        },
      ]}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
        hitSlop={12}
        style={styles.backBtn}
        testID="settings-back"
      >
        <Feather
          name={isRTL ? "chevron-right" : "chevron-left"}
          size={26}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {t("settings.title")}
      </AppText>
      <View style={styles.backBtn}>
        {saving ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : null}
      </View>
    </View>
  );

  if (!isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.empty}>
          <Feather name="lock" size={56} color={colors.mutedForeground} />
          <AppText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("settings.signInTitle")}
          </AppText>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[styles.signInBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="settings-signin"
          >
            <AppText style={[styles.signInText, { color: colors.primaryForeground }]}>
              {t("settings.signInCta")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  const ordered = prefs
    ? [...prefs].sort(
        (a, b) => CATEGORY_ORDER.indexOf(a.type) - CATEGORY_ORDER.indexOf(b.type),
      )
    : [];

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const emailVerified =
    user?.primaryEmailAddress?.verification?.status === "verified";
  const passwordEnabled = user?.passwordEnabled ?? false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Notifications */}
        <SectionTitle label={t("settings.notificationsSection")} colors={colors} isRTL={isRTL} marginTop={8} />
        <AppText style={[styles.sectionHint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
          {t("settings.notificationsHint")}
        </AppText>

        <View style={[styles.channelHeader, { flexDirection: rowDir }]}>
          <View style={{ flex: 1 }} />
          <AppText style={[styles.channelLabel, { color: colors.mutedForeground }]}>
            {t("settings.channelInApp")}
          </AppText>
          <AppText style={[styles.channelLabel, { color: colors.mutedForeground }]}>
            {t("settings.channelEmail")}
          </AppText>
        </View>

        {query.isLoading && !prefs ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          ordered.map((p) => (
            <View
              key={p.type}
              style={[styles.prefRow, { flexDirection: rowDir, borderBottomColor: colors.border }]}
            >
              <AppText
                style={[styles.prefLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
              >
                {t(`settings.cat_${p.type}`)}
              </AppText>
              <View style={styles.switchCell}>
                <Switch
                  value={p.in_app}
                  onValueChange={() => togglePref(p.type, "in_app")}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                  testID={`pref-${p.type}-in_app`}
                />
              </View>
              <View style={styles.switchCell}>
                <Switch
                  value={p.email}
                  onValueChange={() => togglePref(p.type, "email")}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                  testID={`pref-${p.type}-email`}
                />
              </View>
            </View>
          ))
        )}

        {/* Appearance & Display */}
        <SectionTitle label={t("settings.appearanceSection")} colors={colors} isRTL={isRTL} />
        <SegmentRow
          icon="moon"
          label={t("settings.themeLabel")}
          hint={t("settings.themeHint")}
          options={[
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
          ]}
          value={mode}
          onChange={(v) => {
            Haptics.selectionAsync().catch(() => {});
            setMode(v as "light" | "dark");
          }}
          colors={colors}
          isRTL={isRTL}
          testID="settings-theme"
        />
        <SegmentRow
          icon="globe"
          label={t("settings.languageLabel")}
          hint={t("settings.languageHint")}
          options={[
            { value: "en", label: t("settings.langEnglish") },
            { value: "ar", label: t("settings.langArabic") },
          ]}
          value={lang}
          onChange={(v) => {
            Haptics.selectionAsync().catch(() => {});
            setLang(v as "en" | "ar");
          }}
          colors={colors}
          isRTL={isRTL}
          testID="settings-language"
        />

        {/* Sounds & alerts */}
        <SectionTitle label={t("settings.soundAlertsSection")} colors={colors} isRTL={isRTL} />
        <ToggleRow
          icon="volume-2"
          title={t("settings.soundEffectsTitle")}
          body={t("settings.soundEffectsHint")}
          value={soundEnabled}
          onValueChange={(v) => {
            Haptics.selectionAsync().catch(() => {});
            setSoundEnabled(v);
          }}
          colors={colors}
          isRTL={isRTL}
          testID="settings-sound-effects"
        />
        <ToggleRow
          icon="bell"
          title={t("settings.pushNotifTitle")}
          body={t("settings.pushNotifHint")}
          value={notificationsEnabled}
          onValueChange={(v) => {
            Haptics.selectionAsync().catch(() => {});
            setNotificationsEnabled(v);
          }}
          colors={colors}
          isRTL={isRTL}
          testID="settings-push-notifications"
        />

        {/* Account & Security */}
        <SectionTitle label={t("settings.securitySection")} colors={colors} isRTL={isRTL} />

        <InfoRow
          icon="mail"
          title={t("settings.emailLabel")}
          body={email || t("settings.emailNone")}
          colors={colors}
          isRTL={isRTL}
          trailing={
            email
              ? emailVerified
                ? t("settings.emailVerified")
                : t("settings.emailUnverified")
              : undefined
          }
        />

        <LinkRow
          icon="edit-2"
          label={email ? t("settings.changeEmail") : t("settings.addEmail")}
          hint={t("settings.changeEmailHint")}
          onPress={() => {
            setEmailError(null);
            setEmailStep("input");
            setNewEmail("");
            setEmailCode("");
            pendingEmailRef.current = null;
            setShowEmailModal(true);
          }}
          colors={colors}
          isRTL={isRTL}
          testID="settings-change-email"
        />

        {passwordEnabled ? (
          <LinkRow
            icon="key"
            label={t("settings.changePassword")}
            hint={t("settings.changePasswordHint")}
            onPress={() => {
              setPwError(null);
              setShowPwModal(true);
            }}
            colors={colors}
            isRTL={isRTL}
            testID="settings-change-password"
          />
        ) : (
          <InfoRow
            icon="key"
            title={t("settings.changePassword")}
            body={t("settings.passwordManagedBySso")}
            colors={colors}
            isRTL={isRTL}
          />
        )}

        <LinkRow
          icon="monitor"
          label={t("settings.activeDevices")}
          hint={t("settings.activeDevicesHint")}
          onPress={signOutOtherDevices}
          colors={colors}
          isRTL={isRTL}
          busy={sessionsBusy}
          testID="settings-sessions"
        />
        {otherSessions !== null && otherSessions === 0 ? (
          <AppText
            style={[styles.metaNote, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
          >
            {t("settings.onlyThisDevice")}
          </AppText>
        ) : null}

        <ToggleRow
          icon="smartphone"
          title={t("settings.biometricTitle")}
          body={
            biometric.supported
              ? t("settings.biometricHint")
              : t("settings.biometricUnavailable")
          }
          value={biometric.enabled}
          onValueChange={onToggleBiometric}
          disabled={!biometric.supported}
          colors={colors}
          isRTL={isRTL}
          testID="settings-biometric"
        />

        <InfoRow
          icon="shield"
          title={t("settings.twoStepTitle")}
          body={t("settings.twoStepBody")}
          colors={colors}
          isRTL={isRTL}
        />

        <InfoRow
          icon="log-in"
          title={t("settings.signInMethodsTitle")}
          body={t("settings.signInMethodsBody")}
          colors={colors}
          isRTL={isRTL}
        />

        <LinkRow
          icon="user"
          label={t("settings.editProfile")}
          onPress={() => router.push("/(tabs)/profile")}
          colors={colors}
          isRTL={isRTL}
          testID="settings-edit-profile"
        />
        <LinkRow
          icon="shield"
          label={t("settings.businessVerification")}
          hint={t("settings.businessVerificationHint")}
          onPress={() => router.push("/business/verification")}
          colors={colors}
          isRTL={isRTL}
          testID="settings-verification"
        />

        {/* Billing & Payments */}
        <SectionTitle label={t("settings.billingSection")} colors={colors} isRTL={isRTL} />

        <LinkRow
          icon="star"
          label={t("settings.plansLink")}
          hint={t("settings.plansLinkHint")}
          onPress={() => router.push("/plans")}
          colors={colors}
          isRTL={isRTL}
          testID="settings-plans"
        />
        <LinkRow
          icon="credit-card"
          label={t("settings.walletLink")}
          hint={t("settings.walletLinkHint")}
          onPress={() => router.push("/wallet")}
          colors={colors}
          isRTL={isRTL}
          testID="settings-wallet"
        />

        {/* Privacy & Safety */}
        <SectionTitle label={t("settings.safetySection")} colors={colors} isRTL={isRTL} />

        <InfoRow
          icon="user-check"
          title={t("settings.fraudTitle")}
          body={t("settings.fraudBody")}
          colors={colors}
          isRTL={isRTL}
        />
        <InfoRow
          icon="alert-triangle"
          title={t("settings.safetyTipsTitle")}
          body={t("settings.safetyTipsBody")}
          colors={colors}
          isRTL={isRTL}
        />
        <LinkRow
          icon="flag"
          label={t("settings.reportProblem")}
          onPress={() => openMail(t("settings.reportSubject"))}
          colors={colors}
          isRTL={isRTL}
          testID="settings-report"
        />
        <LinkRow
          icon="life-buoy"
          label={t("settings.contactSupport")}
          onPress={() => openMail(t("settings.supportSubject"))}
          colors={colors}
          isRTL={isRTL}
          testID="settings-support"
        />

        {/* Legal — privacy & terms (moved off the profile face) */}
        <SectionTitle label={t("settings.legalSection")} colors={colors} isRTL={isRTL} />
        <LinkRow
          icon="shield"
          label={t("settings.privacyPolicy")}
          onPress={() => router.push("/legal/privacy")}
          colors={colors}
          isRTL={isRTL}
          testID="settings-privacy"
        />
        <LinkRow
          icon="file-text"
          label={t("settings.termsOfService")}
          onPress={() => router.push("/legal/terms")}
          colors={colors}
          isRTL={isRTL}
          testID="settings-terms"
        />

        {/* Danger Zone */}
        <SectionTitle label={t("settings.dangerSection")} colors={colors} isRTL={isRTL} />

        <LinkRow
          icon="log-out"
          label={t("settings.signOut")}
          onPress={confirmSignOut}
          colors={colors}
          isRTL={isRTL}
          danger
          testID="settings-signout"
        />
        <LinkRow
          icon="trash-2"
          label={t("settings.deleteAccount")}
          hint={t("settings.deleteAccountHint")}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (passwordEnabled) {
              setDeletePw("");
              setRevealDeletePw(false);
              setDeletePwError(null);
              setShowDeletePw(true);
            } else {
              setShowDelete(true);
            }
          }}
          colors={colors}
          isRTL={isRTL}
          danger
          testID="settings-delete-account"
        />
      </ScrollView>

      {/* Change password modal */}
      <Modal
        visible={showPwModal}
        transparent
        animationType="fade"
        onRequestClose={() => !pwSaving && setShowPwModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
            ]}
          >
            <AppText style={[styles.modalTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {t("settings.changePassword")}
            </AppText>
            <PasswordField
              value={currentPw}
              onChangeText={setCurrentPw}
              placeholder={t("settings.currentPassword")}
              reveal={revealCurrent}
              onToggleReveal={() => setRevealCurrent((v) => !v)}
              editable={!pwSaving}
              colors={colors}
              isRTL={isRTL}
              showLabel={t("settings.showPassword")}
              hideLabel={t("settings.hidePassword")}
              testID="current-password-input"
            />
            <PasswordField
              value={newPw}
              onChangeText={setNewPw}
              placeholder={t("settings.newPassword")}
              reveal={revealNew}
              onToggleReveal={() => setRevealNew((v) => !v)}
              editable={!pwSaving}
              colors={colors}
              isRTL={isRTL}
              showLabel={t("settings.showPassword")}
              hideLabel={t("settings.hidePassword")}
              testID="new-password-input"
            />
            <PasswordField
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder={t("settings.confirmNewPassword")}
              reveal={revealConfirm}
              onToggleReveal={() => setRevealConfirm((v) => !v)}
              editable={!pwSaving}
              colors={colors}
              isRTL={isRTL}
              showLabel={t("settings.showPassword")}
              hideLabel={t("settings.hidePassword")}
              testID="confirm-password-input"
            />
            {pwError ? (
              <AppText style={[styles.modalError, { color: colors.destructive, textAlign: isRTL ? "right" : "left" }]}>
                {pwError}
              </AppText>
            ) : null}
            <Pressable
              onPress={submitPassword}
              disabled={pwSaving}
              style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pwSaving ? 0.6 : 1 }]}
              testID="submit-password"
            >
              {pwSaving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <AppText style={[styles.modalPrimaryText, { color: colors.primaryForeground }]}>
                  {t("settings.updatePassword")}
                </AppText>
              )}
            </Pressable>
            <Pressable
              onPress={() => !pwSaving && setShowPwModal(false)}
              style={styles.modalCancelBtn}
            >
              <AppText style={[styles.modalCancelText, { color: colors.foreground }]}>
                {t("common.cancel")}
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Change / add email modal — two-step Clerk verify flow */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => !emailSaving && closeEmailModal()}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
            ]}
          >
            <AppText style={[styles.modalTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {email ? t("settings.changeEmail") : t("settings.addEmail")}
            </AppText>
            {emailStep === "input" ? (
              <>
                <AppText style={[styles.deleteBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                  {t("settings.changeEmailBody")}
                </AppText>
                <TextInput
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder={t("settings.newEmailPlaceholder")}
                  placeholderTextColor={colors.mutedForeground}
                  editable={!emailSaving}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                  testID="new-email-input"
                />
              </>
            ) : (
              <>
                <AppText style={[styles.deleteBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                  {t("settings.emailCodeBody")} {newEmail.trim()}
                </AppText>
                <TextInput
                  value={emailCode}
                  onChangeText={setEmailCode}
                  placeholder={t("settings.emailCodePlaceholder")}
                  placeholderTextColor={colors.mutedForeground}
                  editable={!emailSaving}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                  testID="email-code-input"
                />
              </>
            )}
            {emailError ? (
              <AppText style={[styles.modalError, { color: colors.destructive, textAlign: isRTL ? "right" : "left" }]}>
                {emailError}
              </AppText>
            ) : null}
            <Pressable
              onPress={emailStep === "input" ? startEmailChange : verifyEmailChange}
              disabled={emailSaving}
              style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: emailSaving ? 0.6 : 1 }]}
              testID="submit-email"
            >
              {emailSaving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <AppText style={[styles.modalPrimaryText, { color: colors.primaryForeground }]}>
                  {emailStep === "input" ? t("settings.sendCode") : t("settings.verifyAndSave")}
                </AppText>
              )}
            </Pressable>
            <Pressable
              onPress={() => !emailSaving && closeEmailModal()}
              style={styles.modalCancelBtn}
            >
              <AppText style={[styles.modalCancelText, { color: colors.foreground }]}>
                {t("common.cancel")}
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete account — password-gated confirmation */}
      <Modal
        visible={showDeletePw}
        transparent
        animationType="fade"
        onRequestClose={() => !deletePwBusy && setShowDeletePw(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
            ]}
          >
            <AppText style={[styles.modalTitle, { color: colors.destructive, textAlign: isRTL ? "right" : "left" }]}>
              {t("settings.deletePasswordTitle")}
            </AppText>
            <AppText
              style={[styles.deleteBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
            >
              {t("settings.deletePasswordBody")}
            </AppText>
            <PasswordField
              value={deletePw}
              onChangeText={setDeletePw}
              placeholder={t("settings.deletePasswordPlaceholder")}
              reveal={revealDeletePw}
              onToggleReveal={() => setRevealDeletePw((v) => !v)}
              editable={!deletePwBusy}
              colors={colors}
              isRTL={isRTL}
              showLabel={t("settings.showPassword")}
              hideLabel={t("settings.hidePassword")}
              testID="delete-password-input"
            />
            {deletePwError ? (
              <AppText style={[styles.modalError, { color: colors.destructive, textAlign: isRTL ? "right" : "left" }]}>
                {deletePwError}
              </AppText>
            ) : null}
            <Pressable
              onPress={verifyAndDelete}
              disabled={deletePwBusy}
              style={[styles.modalPrimaryBtn, { backgroundColor: colors.destructive, borderRadius: colors.radius, opacity: deletePwBusy ? 0.6 : 1 }]}
              testID="submit-delete-password"
            >
              {deletePwBusy ? (
                <ActivityIndicator size="small" color={colors.destructiveForeground} />
              ) : (
                <AppText style={[styles.modalPrimaryText, { color: colors.destructiveForeground }]}>
                  {t("settings.deleteConfirmBtn")}
                </AppText>
              )}
            </Pressable>
            <Pressable
              onPress={() => !deletePwBusy && setShowDeletePw(false)}
              style={styles.modalCancelBtn}
            >
              <AppText style={[styles.modalCancelText, { color: colors.foreground }]}>
                {t("common.cancel")}
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <DeleteAccountModal
        visible={showDelete}
        deleting={deleting}
        colors={colors}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setShowDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionHint: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingBottom: 10,
    lineHeight: 18,
  },
  channelHeader: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: "center",
    gap: 8,
  },
  channelLabel: { width: 52, fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  loading: { padding: 24, alignItems: "center" },
  prefRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  prefLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  switchCell: { width: 52, alignItems: "center" },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: "flex-start",
    gap: 12,
  },
  infoTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  infoBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  trailing: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  linkRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  linkLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  linkHint: { fontSize: 12.5, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  langToggle: { flexDirection: "row", borderWidth: 1, padding: 2, gap: 2 },
  langOption: { paddingHorizontal: 12, paddingVertical: 5, minWidth: 36, alignItems: "center" },
  langOptionText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  metaNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  signInBtn: { paddingHorizontal: 24, paddingVertical: 13 },
  signInText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalSheet: { width: "100%", maxWidth: 420, borderWidth: 1, padding: 22 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  modalError: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  deleteBody: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  pwFieldWrap: { justifyContent: "center", marginBottom: 12 },
  eyeBtn: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  segmentTrack: {
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  modalPrimaryBtn: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  modalPrimaryText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  modalCancelBtn: { paddingVertical: 12, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
