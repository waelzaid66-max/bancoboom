// Suppliers directory (Task #40). Real active-listing + follower counts from the
// directory endpoint; Follow/Unfollow is viewer-relative and server-backed. No
// fabricated metrics. Tapping a supplier opens its public company profile.
import { Feather, MaterialCommunityIcons } from "@/components/icons";
import { useUser } from "@clerk/expo";
import {
  CompanyDirectoryItem,
  useFollowCompany,
  useListCompanies,
  useUnfollowCompany,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;
type T = (k: string, vars?: Record<string, string | number>) => string;

export default function SuppliersScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";
  const writeDir: "rtl" | "ltr" = isRTL ? "rtl" : "ltr";

  const { isSignedIn, isLoaded } = useUser();

  const [queryText, setQueryText] = useState("");
  const [applied, setApplied] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const params = {
    q: applied.trim() || undefined,
    verified: verifiedOnly || undefined,
  };
  const { data, isLoading, isError, refetch, isRefetching } =
    useListCompanies(params);
  const items = data?.data ?? [];

  const followM = useFollowCompany();
  const unfollowM = useUnfollowCompany();
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleFollow = (item: CompanyDirectoryItem) => {
    if (isLoaded && !isSignedIn) {
      router.push("/(tabs)/profile");
      return;
    }
    setBusyId(item.id);
    const m = item.is_following ? unfollowM : followM;
    m.mutate(
      { id: item.id },
      {
        onSuccess: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          refetch().finally(() => setBusyId(null));
        },
        onError: () => setBusyId(null),
      },
    );
  };

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
        testID="suppliers-back"
      >
        <Feather
          name={isRTL ? "arrow-right" : "arrow-left"}
          size={22}
          color={colors.foreground}
        />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
        {t("business.suppliers.title")}
      </AppText>
      <View style={styles.iconBtn} />
    </View>
  );

  const Filters = (
    <View style={styles.filters}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
            borderRadius: colors.radius,
            flexDirection: rowDir,
          },
        ]}
      >
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          value={queryText}
          onChangeText={setQueryText}
          onSubmitEditing={() => setApplied(queryText)}
          placeholder={t("business.suppliers.searchPh")}
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="search"
          style={[
            styles.searchInput,
            { color: colors.foreground, textAlign, writingDirection: writeDir },
          ]}
          testID="suppliers-search"
        />
        {queryText.length > 0 ? (
          <Pressable
            onPress={() => {
              setQueryText("");
              setApplied("");
            }}
            hitSlop={10}
          >
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => setVerifiedOnly((v) => !v)}
        style={[
          styles.verifiedToggle,
          {
            backgroundColor: verifiedOnly ? colors.primary : colors.secondary,
            borderColor: verifiedOnly ? colors.primary : colors.border,
            borderRadius: colors.radius,
            flexDirection: rowDir,
          },
        ]}
        testID="suppliers-verified-toggle"
      >
        <MaterialCommunityIcons
          name="check-decagram"
          size={15}
          color={verifiedOnly ? colors.primaryForeground : colors.mutedForeground}
        />
        <AppText
          style={[
            styles.verifiedText,
            { color: verifiedOnly ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {t("business.suppliers.verifiedOnly")}
        </AppText>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Header}
      {Filters}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.common.loadError")}
          </AppText>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            testID="suppliers-retry"
          >
            <AppText style={[styles.retryText, { color: colors.primaryForeground }]}>
              {t("business.common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("business.suppliers.empty")}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <SupplierCard
              item={item}
              colors={colors}
              t={t}
              rowDir={rowDir}
              textAlign={textAlign}
              busy={busyId === item.id}
              onPress={() => router.push(`/business/company/${item.id}`)}
              onToggleFollow={() => toggleFollow(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function SupplierCard({
  item,
  colors,
  t,
  rowDir,
  textAlign,
  busy,
  onPress,
  onToggleFollow,
}: {
  item: CompanyDirectoryItem;
  colors: Colors;
  t: T;
  rowDir: "row" | "row-reverse";
  textAlign: "left" | "right";
  busy: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}
      testID={`supplier-item-${item.id}`}
    >
      <View style={[styles.cardTop, { flexDirection: rowDir }]}>
        <View
          style={[
            styles.logo,
            { backgroundColor: colors.secondary, borderRadius: colors.radius },
          ]}
        >
          <MaterialCommunityIcons
            name="office-building-outline"
            size={22}
            color={colors.mutedForeground}
          />
        </View>
        <View style={styles.cardInfo}>
          <View style={[styles.nameRow, { flexDirection: rowDir }]}>
            <AppText
              style={[styles.name, { color: colors.foreground, textAlign }]}
              numberOfLines={1}
            >
              {item.name}
            </AppText>
            {item.is_verified && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={15}
                color={colors.primary}
              />
            )}
          </View>
          <View style={[styles.tagRow, { flexDirection: rowDir }]}>
            {item.industry ? (
              <AppText style={[styles.tag, { color: colors.mutedForeground }]} numberOfLines={1}>
                {t(`business.ind.${item.industry}`)}
              </AppText>
            ) : null}
            {item.hq_country ? (
              <>
                {item.industry ? (
                  <AppText style={[styles.tagDot, { color: colors.mutedForeground }]}>•</AppText>
                ) : null}
                <AppText style={[styles.tag, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.hq_country}
                </AppText>
              </>
            ) : null}
          </View>
        </View>
      </View>

      <View style={[styles.statsRow, { flexDirection: rowDir, borderTopColor: colors.border }]}>
        <View style={[styles.stat, { flexDirection: rowDir }]}>
          <AppText style={[styles.statValue, { color: colors.foreground }]}>
            {item.active_listings}
          </AppText>
          <AppText style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {t("business.suppliers.activeListings")}
          </AppText>
        </View>
        <View style={[styles.stat, { flexDirection: rowDir }]}>
          <AppText style={[styles.statValue, { color: colors.foreground }]}>
            {item.follower_count}
          </AppText>
          <AppText style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {t("business.suppliers.followers")}
          </AppText>
        </View>

        <Pressable
          onPress={onToggleFollow}
          disabled={busy}
          style={[
            styles.followBtn,
            {
              backgroundColor: item.is_following ? colors.secondary : colors.primary,
              borderColor: item.is_following ? colors.border : colors.primary,
              borderRadius: colors.radius,
              opacity: busy ? 0.6 : 1,
            },
          ]}
          testID={`supplier-follow-${item.id}`}
        >
          {busy ? (
            <ActivityIndicator
              size="small"
              color={item.is_following ? colors.foreground : colors.primaryForeground}
            />
          ) : (
            <AppText
              style={[
                styles.followText,
                { color: item.is_following ? colors.foreground : colors.primaryForeground },
              ]}
            >
              {item.is_following
                ? t("business.suppliers.following")
                : t("business.suppliers.follow")}
            </AppText>
          )}
        </Pressable>
      </View>
    </Pressable>
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
  filters: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  searchBox: {
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  verifiedToggle: {
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  verifiedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  stateWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  stateTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 6 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 14 },
  retryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
  card: { padding: 14, marginBottom: 12, gap: 12 },
  cardTop: { alignItems: "center", gap: 12 },
  logo: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 4 },
  nameRow: { alignItems: "center", gap: 6 },
  name: { flexShrink: 1, fontSize: 15.5, fontFamily: "Inter_600SemiBold" },
  tagRow: { alignItems: "center", gap: 6, flexWrap: "wrap" },
  tag: { fontSize: 12.5, fontFamily: "Inter_400Regular", flexShrink: 1 },
  tagDot: { fontSize: 12 },
  statsRow: { alignItems: "center", gap: 16, borderTopWidth: 1, paddingTop: 12 },
  stat: { alignItems: "baseline", gap: 5 },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  followBtn: {
    marginLeft: "auto",
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
  },
  followText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
});
