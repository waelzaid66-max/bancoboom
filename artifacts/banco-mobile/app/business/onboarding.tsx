import { useUser } from "@clerk/expo";
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import {
  updateMe,
  UpdateMeBodyAccountType,
  UpdateMeBodyBusinessActivityType,
} from "@workspace/api-client-react";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { uploadImageAsset } from "@/lib/upload";

const MAX_DOCS = 6;
type VerificationDoc = { localUri: string; url: string };

type Activity = keyof typeof UpdateMeBodyBusinessActivityType;

type FiLicenseType =
  | "bank"
  | "financing_company"
  | "leasing"
  | "microfinance"
  | "insurance"
  | "other";

const FI_LICENSE_TYPES: readonly {
  value: FiLicenseType;
  labelKey:
    | "business.fiTypeBank"
    | "business.fiTypeFinancingCompany"
    | "business.fiTypeLeasing"
    | "business.fiTypeMicrofinance"
    | "business.fiTypeInsurance"
    | "business.fiTypeOther";
}[] = [
  { value: "bank", labelKey: "business.fiTypeBank" },
  { value: "financing_company", labelKey: "business.fiTypeFinancingCompany" },
  { value: "leasing", labelKey: "business.fiTypeLeasing" },
  { value: "microfinance", labelKey: "business.fiTypeMicrofinance" },
  { value: "insurance", labelKey: "business.fiTypeInsurance" },
  { value: "other", labelKey: "business.fiTypeOther" },
];

const ACTIVITIES: {
  value: Activity;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}[] = [
  { value: "car_dealer", icon: "car-outline" },
  { value: "real_estate_developer", icon: "office-building-outline" },
  { value: "factory", icon: "factory" },
  { value: "supplier", icon: "truck-outline" },
  // FI accounts verify through the same flow — with their OWN activity, so a
  // bank never has to mislabel itself as a dealer/factory to get verified.
  { value: "financial_institution", icon: "bank-outline" },
];

export default function BusinessOnboardingScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { user, isLoaded, isSignedIn } = useUser();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const params = useLocalSearchParams<{ intent?: string }>();
  const fiIntent = params.intent === "fi";

  const visibleActivities = useMemo(
    () =>
      fiIntent
        ? ACTIVITIES.filter((a) => a.value === "financial_institution")
        : ACTIVITIES,
    [fiIntent],
  );

  const [activity, setActivity] = useState<Activity | null>(
    fiIntent ? "financial_institution" : null,
  );
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  // FI-only regulatory identity. A financial institution must not be verified on
  // the same evidence as a car dealer (audit S2: shared onboarding form).
  const [fiLicenseNumber, setFiLicenseNumber] = useState("");
  const [fiLicenseType, setFiLicenseType] = useState<FiLicenseType | null>(null);
  const [fiRegulator, setFiRegulator] = useState("");
  const [fiRegistryNumber, setFiRegistryNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [docs, setDocs] = useState<VerificationDoc[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [failedDocs, setFailedDocs] = useState<ImagePicker.ImagePickerAsset[]>(
    [],
  );
  const [idPhoto, setIdPhoto] = useState<VerificationDoc | null>(null);
  const [uploadingId, setUploadingId] = useState(false);

  // Camera is enabled ONLY for this verification flow. If permission is
  // permanently denied (native), route the user to Settings; otherwise surface
  // an inline rationale. Listing/profile media stays library-only elsewhere.
  const requestCameraPermission = async (): Promise<boolean> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) return true;
    if (Platform.OS !== "web" && !perm.canAskAgain) {
      Alert.alert(t("business.cameraDeniedTitle"), t("business.cameraDeniedBody"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("business.openSettings"),
          onPress: () => Linking.openSettings().catch(() => {}),
        },
      ]);
    } else {
      setError(t("business.cameraPermission"));
    }
    return false;
  };

  // Upload picked/captured assets in parallel with bounded concurrency: fast on
  // a good connection without saturating a weak one, and a single failed
  // document never blocks the rest of the batch. Each upload already retries its
  // own request-url + PUT internally; anything that still fails lands in
  // `failedDocs` so the user can retry exactly those with one tap (rather than
  // re-picking everything). MAX_DOCS is enforced up front and again on commit.
  const uploadDocAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setError(null);
    setUploadingDoc(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const remaining = MAX_DOCS - docs.length;
    const batch = assets.slice(0, Math.max(0, remaining));
    const retriedUris = new Set(batch.map((a) => a.uri));
    const succeeded: VerificationDoc[] = [];
    const failed: ImagePicker.ImagePickerAsset[] = [];

    const CONCURRENCY = 2;
    let cursor = 0;
    const worker = async () => {
      while (cursor < batch.length) {
        const asset = batch[cursor++];
        try {
          const url = await uploadImageAsset(asset);
          succeeded.push({ localUri: asset.uri, url });
        } catch {
          failed.push(asset);
        }
      }
    };
    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker),
      );
    } finally {
      setUploadingDoc(false);
    }

    if (succeeded.length > 0) {
      setDocs((prev) => [...prev, ...succeeded].slice(0, MAX_DOCS));
    }
    // Drop anything we just retried from the failed bucket, then append the
    // fresh failures so the visible count never double-counts a retried doc.
    setFailedDocs((prev) => [
      ...prev.filter((a) => !retriedUris.has(a.uri)),
      ...failed,
    ]);
    if (failed.length > 0) {
      setError(
        t("business.docsSomeFailed", {
          failed: failed.length,
          total: batch.length,
        }),
      );
    }
  };

  const retryFailedDoc = (asset: ImagePicker.ImagePickerAsset) => {
    if (uploadingDoc || docs.length >= MAX_DOCS) return;
    void uploadDocAssets([asset]);
  };

  const removeFailedDoc = (uri: string) =>
    setFailedDocs((prev) => prev.filter((a) => a.uri !== uri));

  const pickDocsFromLibrary = async () => {
    if (docs.length >= MAX_DOCS) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(t("business.docsPermission"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        selectionLimit: MAX_DOCS - docs.length,
        allowsMultipleSelection: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      await uploadDocAssets(result.assets);
    } catch {
      setError(t("business.docsUploadFailed"));
    }
  };

  const captureDoc = async () => {
    if (docs.length >= MAX_DOCS) return;
    try {
      if (!(await requestCameraPermission())) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      if (result.canceled || result.assets.length === 0) return;
      await uploadDocAssets(result.assets);
    } catch {
      setError(t("business.docsUploadFailed"));
    }
  };

  // Native: offer camera or library. Web: RN-Web Alert can't render a
  // multi-button sheet, so go straight to the library.
  const addDocument = () => {
    if (docs.length >= MAX_DOCS || uploadingDoc) return;
    if (Platform.OS === "web") {
      void pickDocsFromLibrary();
      return;
    }
    Alert.alert(t("business.docSource"), undefined, [
      { text: t("business.takePhoto"), onPress: () => void captureDoc() },
      {
        text: t("business.chooseFromLibrary"),
        onPress: () => void pickDocsFromLibrary(),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const applyIdResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setError(null);
    setUploadingId(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const url = await uploadImageAsset(asset);
      setIdPhoto({ localUri: asset.uri, url });
    } catch {
      setError(t("business.docsUploadFailed"));
    } finally {
      setUploadingId(false);
    }
  };

  const captureIdPhoto = async () => {
    try {
      if (!(await requestCameraPermission())) return;
      await applyIdResult(
        await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.9,
        }),
      );
    } catch {
      setError(t("business.docsUploadFailed"));
    }
  };

  const pickIdFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(t("business.docsPermission"));
        return;
      }
      await applyIdResult(
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.9,
        }),
      );
    } catch {
      setError(t("business.docsUploadFailed"));
    }
  };

  const addIdPhoto = () => {
    if (uploadingId) return;
    if (Platform.OS === "web") {
      void pickIdFromLibrary();
      return;
    }
    Alert.alert(t("business.idPhoto"), undefined, [
      { text: t("business.takePhoto"), onPress: () => void captureIdPhoto() },
      {
        text: t("business.chooseFromLibrary"),
        onPress: () => void pickIdFromLibrary(),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const removeDoc = (url: string) =>
    setDocs((prev) => prev.filter((d) => d.url !== url));

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.secondary,
      color: colors.foreground,
      borderColor: colors.border,
      borderRadius: colors.radius,
      textAlign: (isRTL ? "right" : "left") as "right" | "left",
    },
  ];

  const handleSubmit = async () => {
    if (!activity) {
      setError(t("business.errActivity"));
      return;
    }
    if (!businessName.trim()) {
      setError(t("business.errName"));
      return;
    }
    if (!ownerName.trim()) {
      setError(t("business.errOwnerName"));
      return;
    }
    if (!city.trim()) {
      setError(t("business.errCity"));
      return;
    }
    if (fiIntent || activity === "financial_institution") {
      if (!fiLicenseNumber.trim()) {
        setError(t("business.errFiLicenseNumber"));
        return;
      }
      if (!fiLicenseType) {
        setError(t("business.errFiLicenseType"));
        return;
      }
      if (!fiRegulator.trim()) {
        setError(t("business.errFiRegulator"));
        return;
      }
      if (!fiRegistryNumber.trim()) {
        setError(t("business.errFiRegistryNumber"));
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // The flat companyDetails.documents[] is the admin's review source of
      // truth; the identity photo rides along in the same array.
      const documentUrls = [
        ...docs.map((d) => d.url),
        ...(idPhoto ? [idPhoto.url] : []),
      ];
      const isFi = fiIntent || activity === "financial_institution";
      await updateMe({
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        // Only force account_type for FI — other paths (company/dealer) already
        // set it from Profile, and omitting it lets the server preserve elevated
        // roles while still mapping bank activity → financial_institution.
        ...(isFi
          ? {
              account_type: UpdateMeBodyAccountType.financial_institution,
            }
          : {}),
        business: {
          activity_type: UpdateMeBodyBusinessActivityType[activity],
          business_name: businessName.trim(),
          owner_name: ownerName.trim(),
          ...(tradeName.trim() ? { trade_name: tradeName.trim() } : {}),
          city: city.trim(),
          ...(documentUrls.length > 0 ? { documents: documentUrls } : {}),
          // Sent only on the FI path so dealer/factory payloads stay unchanged.
          ...(isFi && fiLicenseType
            ? {
                fi_license_number: fiLicenseNumber.trim(),
                fi_license_type: fiLicenseType,
                fi_regulator: fiRegulator.trim(),
                fi_registry_number: fiRegistryNumber.trim(),
              }
            : {}),
        },
      });
      // Refresh Clerk so the new role is reflected across the app.
      await user?.reload().catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t("business.errSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  const Header = (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 12,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Pressable
        onPress={() => router.back()}
        style={styles.backBtn}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        testID="business-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.title")}
      </AppText>
      <View style={styles.backBtn} />
    </View>
  );

  if (!isLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="account-lock-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.signInRequired")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("business.signInBody")}
          </AppText>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="business-go-signin"
          >
            <AppText
              style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
            >
              {t("business.goToSignIn")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (done) {
    const isFiDone = fiIntent || activity === "financial_institution";
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Header}
        <View style={styles.stateWrap}>
          <View
            style={[
              styles.successBadge,
              { backgroundColor: colors.primary + "1A" },
            ]}
          >
            <MaterialCommunityIcons
              name={isFiDone ? "bank-check" : "storefront-check-outline"}
              size={48}
              color={colors.primary}
            />
          </View>
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t(isFiDone ? "business.fiSuccessTitle" : "business.successTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t(isFiDone ? "business.fiSuccessBody" : "business.successBody")}
          </AppText>
          <View
            style={[
              styles.reviewBox,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
              isRTL && styles.rowReverse,
            ]}
          >
            <Feather name="clock" size={15} color={colors.mutedForeground} />
            <AppText
              style={[
                styles.reviewText,
                {
                  color: colors.mutedForeground,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {t("business.reviewNote")}
            </AppText>
          </View>
          {isFiDone ? (
            <Pressable
              onPress={() => router.replace("/business/banks")}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
              ]}
              testID="business-go-banks"
            >
              <MaterialCommunityIcons
                name="bank-outline"
                size={18}
                color={colors.primaryForeground}
              />
              <AppText
                style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
              >
                {t("business.fiGoBanks")}
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.replace("/listings/create")}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
              ]}
              testID="business-start-listing"
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              <AppText
                style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
              >
                {t("business.startListing")}
              </AppText>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={styles.secondaryBtn}
            testID="business-go-profile"
          >
            <AppText style={[styles.secondaryBtnText, { color: colors.primary }]}>
              {t("business.goToProfile")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText
          style={[
            styles.subtitle,
            {
              color: colors.mutedForeground,
              textAlign: isRTL ? "right" : "left",
            },
          ]}
        >
          {t("business.subtitle")}
        </AppText>

        <AppText
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.activityType")}
        </AppText>
        <View style={styles.activityGrid}>
          {visibleActivities.map((a) => {
            const active = activity === a.value;
            return (
              <Pressable
                key={a.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActivity(a.value);
                  setError(null);
                }}
                style={[
                  styles.activityCard,
                  {
                    backgroundColor: active
                      ? colors.primary + "14"
                      : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                testID={`activity-${a.value}`}
              >
                <MaterialCommunityIcons
                  name={a.icon}
                  size={26}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                <AppText
                  style={[
                    styles.activityText,
                    { color: active ? colors.primary : colors.foreground },
                  ]}
                >
                  {t(`business.activities.${a.value}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.businessName")}
        </AppText>
        <TextInput
          value={businessName}
          onChangeText={(v) => {
            setBusinessName(v);
            setError(null);
          }}
          placeholder={t("business.businessNamePlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="business-name-input"
        />

        <AppText
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.ownerName")}
        </AppText>
        <TextInput
          value={ownerName}
          onChangeText={(v) => {
            setOwnerName(v);
            setError(null);
          }}
          placeholder={t("business.ownerNamePlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="business-owner-name-input"
        />

        <AppText
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.tradeName")}
        </AppText>
        <TextInput
          value={tradeName}
          onChangeText={setTradeName}
          placeholder={t("business.tradeNamePlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="business-trade-name-input"
        />

        <AppText
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.city")}
        </AppText>
        <TextInput
          value={city}
          onChangeText={(v) => {
            setCity(v);
            setError(null);
          }}
          placeholder={t("business.cityPlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          testID="business-city-input"
        />

        <AppText
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.phone")}
        </AppText>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder={t("business.phonePlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          keyboardType="phone-pad"
          autoCorrect={false}
          testID="business-phone-input"
        />

        {(fiIntent || activity === "financial_institution") && (
          <View style={styles.fiBlock}>
            <AppText
              style={[
                styles.label,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("business.fiSectionTitle")}
            </AppText>
            <AppText
              style={[
                styles.docsHint,
                {
                  color: colors.mutedForeground,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {t("business.fiSectionNote")}
            </AppText>

            <AppText
              style={[
                styles.label,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("business.fiLicenseNumber")}
            </AppText>
            <TextInput
              value={fiLicenseNumber}
              onChangeText={(v) => {
                setFiLicenseNumber(v);
                setError(null);
              }}
              placeholder={t("business.fiLicenseNumberPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              style={inputStyle}
              autoCorrect={false}
              autoCapitalize="characters"
              testID="fi-license-number-input"
            />

            <AppText
              style={[
                styles.label,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("business.fiLicenseType")}
            </AppText>
            <View style={[styles.fiTypeRow, isRTL && styles.rowReverse]}>
              {FI_LICENSE_TYPES.map((option) => {
                const selected = fiLicenseType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setFiLicenseType(option.value);
                      setError(null);
                    }}
                    style={[
                      styles.fiTypeChip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderRadius: colors.radius,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    testID={`fi-license-type-${option.value}`}
                  >
                    <AppText
                      style={[
                        styles.fiTypeChipText,
                        {
                          color: selected
                            ? colors.primaryForeground
                            : colors.foreground,
                        },
                      ]}
                    >
                      {t(option.labelKey)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <AppText
              style={[
                styles.label,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("business.fiRegulator")}
            </AppText>
            <TextInput
              value={fiRegulator}
              onChangeText={(v) => {
                setFiRegulator(v);
                setError(null);
              }}
              placeholder={t("business.fiRegulatorPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              style={inputStyle}
              testID="fi-regulator-input"
            />

            <AppText
              style={[
                styles.label,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("business.fiRegistryNumber")}
            </AppText>
            <TextInput
              value={fiRegistryNumber}
              onChangeText={(v) => {
                setFiRegistryNumber(v);
                setError(null);
              }}
              placeholder={t("business.fiRegistryNumberPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              style={inputStyle}
              autoCorrect={false}
              testID="fi-registry-number-input"
            />
          </View>
        )}

        <AppText
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.documents")}
        </AppText>
        <AppText
          style={[
            styles.docsHint,
            { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.documentsHint")}
        </AppText>
        <View style={styles.docsGrid}>
          {docs.map((d) => (
            <View key={d.url} style={styles.docThumbWrap}>
              <Image
                source={{ uri: d.localUri }}
                style={[styles.docThumb, { borderColor: colors.border, borderRadius: colors.radius }]}
                contentFit="cover"
              />
              <Pressable
                onPress={() => removeDoc(d.url)}
                style={styles.docRemove}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("common.delete")}
                testID={`doc-remove-${d.url}`}
              >
                <Feather name="x" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
          {failedDocs.map((a) => (
            <View key={`failed-${a.uri}`} style={styles.docThumbWrap}>
              <Image
                source={{ uri: a.uri }}
                style={[
                  styles.docThumb,
                  {
                    borderColor: colors.destructive,
                    borderRadius: colors.radius,
                    opacity: 0.5,
                  },
                ]}
                contentFit="cover"
              />
              <Pressable
                onPress={() => retryFailedDoc(a)}
                disabled={uploadingDoc}
                style={[styles.docRetryOverlay, { borderRadius: colors.radius }]}
                testID={`doc-retry-${a.uri}`}
              >
                <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                <AppText style={styles.docRetryText}>
                  {t("business.docsRetry")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => removeFailedDoc(a.uri)}
                style={styles.docRemove}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("common.delete")}
                testID={`doc-failed-remove-${a.uri}`}
              >
                <Feather name="x" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
          {docs.length < MAX_DOCS && (
            <Pressable
              onPress={addDocument}
              disabled={uploadingDoc}
              style={[
                styles.docAdd,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              testID="business-add-doc"
            >
              {uploadingDoc ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <Feather name="plus" size={20} color={colors.mutedForeground} />
                  <AppText style={[styles.docAddText, { color: colors.mutedForeground }]}>
                    {t("business.documentsAdd")}
                  </AppText>
                </>
              )}
            </Pressable>
          )}
        </View>

        <AppText
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.idPhoto")}
        </AppText>
        <AppText
          style={[
            styles.docsHint,
            { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("business.idPhotoHint")}
        </AppText>
        {idPhoto ? (
          <View style={styles.docThumbWrap}>
            <Image
              source={{ uri: idPhoto.localUri }}
              style={[
                styles.docThumb,
                { borderColor: colors.border, borderRadius: colors.radius },
              ]}
              contentFit="cover"
            />
            <Pressable
              onPress={() => setIdPhoto(null)}
              style={styles.docRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("common.delete")}
              testID="business-id-remove"
            >
              <Feather name="x" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={addIdPhoto}
            disabled={uploadingId}
            style={[
              styles.idAdd,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
              isRTL && styles.rowReverse,
            ]}
            testID="business-add-id"
          >
            {uploadingId ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Feather name="camera" size={18} color={colors.primary} />
                <AppText style={[styles.idAddText, { color: colors.foreground }]}>
                  {t("business.idPhotoAdd")}
                </AppText>
              </>
            )}
          </Pressable>
        )}

        {error && (
          <AppText style={[styles.error, { color: colors.destructive }]}>
            {error}
          </AppText>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={[
            styles.primaryBtn,
            styles.submitBtn,
            {
              backgroundColor: submitting ? colors.secondary : colors.primary,
              borderRadius: colors.radius,
            },
          ]}
          testID="business-submit"
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <AppText
              style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
            >
              {t("business.submit")}
            </AppText>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
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
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 120, gap: 8 },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 12,
    marginBottom: 6,
  },
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  activityCard: {
    flexGrow: 1,
    flexBasis: "45%",
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  activityText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  error: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 10,
    textAlign: "center",
  },
  docsHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
    lineHeight: 17,
  },
  fiBlock: {
    marginTop: 4,
  },
  fiTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  fiTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  fiTypeChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  docsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  docThumbWrap: {
    width: 84,
    height: 84,
    position: "relative",
  },
  docThumb: {
    width: 84,
    height: 84,
    borderWidth: 1,
  },
  docRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  docRetryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  docRetryText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  docAdd: {
    width: 84,
    height: 84,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 4,
  },
  docAddText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  rowReverse: { flexDirection: "row-reverse" },
  idAdd: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  idAddText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  reviewBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  reviewText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  submitBtn: { marginTop: 20 },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: { paddingVertical: 14, marginTop: 4 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  stateTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
    textAlign: "center",
  },
  stateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 8,
  },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
