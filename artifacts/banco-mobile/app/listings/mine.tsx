import { Feather } from "@/components/icons";
import {
  getMyManagedListings,
  deleteListing,
  bumpListing,
  DealerListing,
} from "@workspace/api-client-react";
import { router, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PromoteButton } from "@/components/PromoteButton";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type LoadState = "loading" | "ready" | "error";
type Colors = ReturnType<typeof useColors>;

function formatListedDate(
  iso: string | null | undefined,
  lang: string
): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(
      lang === "ar" ? "ar-EG" : "en-US",
      { month: "short", day: "numeric", year: "numeric" }
    );
  } catch {
    return null;
  }
}

function statusTone(status: string | undefined, colors: Colors) {
  switch (status) {
    case "active":
      return colors.primary;
    default:
      return colors.mutedForeground;
  }
}

function statusLabel(
  status: string | undefined,
  t: (key: string) => string,
) {
  switch (status) {
    case "active":
      return t("mine.statusActive");
    case "sold":
      return t("mine.statusSold");
    case "archived":
      return t("mine.statusArchived");
    default:
      return status ? status.replace(/_/g, " ") : t("mine.statusUnknown");
  }
}

export default function MyListingsScreen() {
  const colors = useColors();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  // Same safe-area contract as Search/Section — fake web 67 crushed chrome.
  const topPad = Math.max(insets.top, Platform.OS === "web" ? 12 : 0);

  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<DealerListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bumpingId, setBumpingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getMyManagedListings();
      setItems(res.data ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const runDelete = useCallback(async (id: string) => {
    try {
      setDeletingId(id);
      await deleteListing(id);
      setItems((prev) => prev.filter((l) => l.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("mine.deleteFailedTitle"), t("mine.deleteFailedBody"));
    } finally {
      setDeletingId(null);
    }
  }, [t]);

  // "Renew" recycles an active listing: the server sets bumped_at=now so it
  // sorts by COALESCE(bumped_at, created_at) and rises in recent results. It
  // NEVER changes the true publish date. Rate-limited server-side (24h
  // cooldown) — surface that honestly instead of pretending it always works.
  const runBump = useCallback(
    async (id: string) => {
      try {
        setBumpingId(id);
        await bumpListing(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("mine.renewSuccessTitle"), t("mine.renewSuccessBody"));
        // Reload so any server-derived change is reflected. A failure here is
        // only a refresh failure — the renew itself already succeeded.
        await load();
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const status = (e as { status?: number } | null)?.status;
        if (status === 429) {
          Alert.alert(t("mine.renewCooldownTitle"), t("mine.renewCooldownBody"));
        } else {
          Alert.alert(t("mine.renewFailedTitle"), t("mine.renewFailedBody"));
        }
      } finally {
        setBumpingId(null);
      }
    },
    [load, t],
  );

  const confirmDelete = useCallback(
    (item: DealerListing) => {
      if (!item.id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        t("mine.deleteTitle"),
        t("mine.deleteBody", {
          title: item.title ?? t("mine.deleteFallbackTitle"),
        }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () => runDelete(item.id as string),
          },
        ],
      );
    },
    [runDelete, t],
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
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          testID="my-listings-back"
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("mine.title")}
        </AppText>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/business/requests")}
            style={styles.backBtn}
            hitSlop={12}
            testID="my-listings-requests"
          >
            <Feather name="bell" size={22} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/listings/create")}
            style={styles.backBtn}
            hitSlop={12}
            testID="my-listings-create"
          >
            <Feather name="plus" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {state === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : state === "error" ? (
        <View style={styles.stateWrap}>
          <Feather name="wifi-off" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("mine.errorTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("mine.errorBody")}
          </AppText>
          <Pressable
            onPress={() => {
              setState("loading");
              load();
            }}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="my-listings-retry"
          >
            <Feather
              name="refresh-cw"
              size={16}
              color={colors.primaryForeground}
            />
            <AppText
              style={[styles.retryText, { color: colors.primaryForeground }]}
            >
              {t("common.retry")}
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <Feather name="inbox" size={52} color={colors.mutedForeground} />
          <AppText style={[styles.stateTitle, { color: colors.foreground }]}>
            {t("mine.emptyTitle")}
          </AppText>
          <AppText style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t("mine.emptyBody")}
          </AppText>
          <Pressable
            onPress={() => router.push("/listings/create")}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="my-listings-empty-create"
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <AppText
              style={[styles.retryText, { color: colors.primaryForeground }]}
            >
              {t("create.title")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={6}
          initialNumToRender={8}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const tone = statusTone(item.status, colors);
            const isDeleting = deletingId === item.id;
            const isBumping = bumpingId === item.id;
            const listed = formatListedDate(item.created_at, lang);
            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <AppText
                      style={[styles.cardTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.title ?? t("mine.untitled")}
                    </AppText>
                    <AppText
                      style={[
                        styles.cardMeta,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {[item.category, item.location]
                        .filter(Boolean)
                        .join("  •  ")}
                    </AppText>
                    {!!item.price_display && (
                      <AppText
                        style={[
                          styles.cardPrice,
                          { color: colors.foreground },
                        ]}
                      >
                        {item.price_display}
                      </AppText>
                    )}
                    {listed ? (
                      <AppText
                        style={[
                          styles.cardListed,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={1}
                      >
                        {t("mine.listedOn", { date: listed })}
                      </AppText>
                    ) : null}
                  </View>
                  <View
                    style={[styles.statusPill, { backgroundColor: tone + "22" }]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: tone }]}
                    />
                    <AppText style={[styles.statusText, { color: tone }]}>
                      {statusLabel(item.status, t)}
                    </AppText>
                  </View>
                </View>

                <View
                  style={[
                    styles.cardDivider,
                    { backgroundColor: colors.border },
                  ]}
                />

                <View style={styles.cardBottom}>
                  <View style={styles.statGroup}>
                    <Stat icon="eye" value={item.views} colors={colors} />
                    <Stat icon="users" value={item.leads} colors={colors} />
                  </View>
                  <View style={styles.cardActions}>
                    {item.id ? (
                      <Pressable
                        onPress={() =>
                          router.push(`/listings/edit/${item.id}` as Href)
                        }
                        style={styles.renewBtn}
                        hitSlop={8}
                        testID={`edit-listing-${item.id}`}
                      >
                        <Feather
                          name="edit-2"
                          size={15}
                          color={colors.primary}
                        />
                        <AppText
                          style={[styles.renewText, { color: colors.primary }]}
                        >
                          {t("mine.edit")}
                        </AppText>
                      </Pressable>
                    ) : null}
                    {item.status === "active" && item.id ? (
                      <Pressable
                        onPress={() => runBump(item.id as string)}
                        disabled={isBumping}
                        style={styles.renewBtn}
                        hitSlop={8}
                        testID={`renew-listing-${item.id}`}
                      >
                        {isBumping ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Feather
                              name="refresh-cw"
                              size={15}
                              color={colors.primary}
                            />
                            <AppText
                              style={[styles.renewText, { color: colors.primary }]}
                            >
                              {t("mine.renew")}
                            </AppText>
                          </>
                        )}
                      </Pressable>
                    ) : null}
                    {item.status === "active" && item.id ? (
                      <PromoteButton listingId={item.id} variant="compact" />
                    ) : null}
                    <Pressable
                      onPress={() => confirmDelete(item)}
                      disabled={isDeleting}
                      style={styles.deleteBtn}
                      hitSlop={8}
                      testID={`delete-listing-${item.id}`}
                    >
                    {isDeleting ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.destructive}
                      />
                    ) : (
                      <>
                        <Feather
                          name="trash-2"
                          size={15}
                          color={colors.destructive}
                        />
                        <AppText
                          style={[
                            styles.deleteText,
                            { color: colors.destructive },
                          ]}
                        >
                          {t("common.delete")}
                        </AppText>
                      </>
                    )}
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function Stat({
  icon,
  value,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: number | undefined;
  colors: Colors;
}) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={14} color={colors.mutedForeground} />
      <AppText style={[styles.statText, { color: colors.mutedForeground }]}>
        {value ?? 0}
      </AppText>
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
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
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  retryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
  card: { padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardMeta: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  cardPrice: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  cardListed: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 3 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontSize: 11.5,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  cardDivider: { height: 1, marginVertical: 12 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statGroup: { flexDirection: "row", gap: 16 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  deleteText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  renewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  renewText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
});
