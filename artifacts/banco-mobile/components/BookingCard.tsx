import { useMemo, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/icons";
import {
  useGetListingAvailability,
  getGetListingAvailabilityQueryKey,
  useCreateBooking,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/LanguageContext";
import { pulseSpark } from "@/lib/brandSpark";
import { AppText } from "@/components/AppText";

/**
 * The hotel model, made visible. Renders ONLY for furnished/daily rentals (the
 * bookable rent mode) — long-term rent and sale keep the plain contact-owner
 * flow, so role separation lives in the UI too. Self-contained: a lightweight
 * two-way calendar (no external date library), night + estimate math, and a
 * single Reserve action wired to POST /v1/listings/:id/bookings. The server
 * stays authoritative on the real total and on double-booking; this widget only
 * guides the guest and greys out nights that are already taken.
 */

/* ── date helpers (local, no Intl dependency) ─────────────── */

const MS_DAY = 86_400_000;

function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s: string, n: number): string {
  return ymd(new Date(parseYmd(s).getTime() + n * MS_DAY));
}
function nightsBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / MS_DAY);
}
function group(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

type Props = {
  listingId: string;
  /** Raw numeric per-night rate (ListingDetail.price_cash); null hides the estimate. */
  pricePerNight: number | null | undefined;
};

export function BookingCard({ listingId, pricePerNight }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const queryClient = useQueryClient();

  const today = useMemo(() => ymd(new Date()), []);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: availData } = useGetListingAvailability(listingId, {
    query: {
      queryKey: getGetListingAvailabilityQueryKey(listingId),
      staleTime: 30_000,
      retry: 1,
    },
  });

  // Booked NIGHTS = [check_in, check_out) of each active range. The checkout day
  // itself is free, so adjacent stays (checkout = next check-in) stay bookable —
  // mirroring the server's overlap rule.
  const bookedNights = useMemo(() => {
    const set = new Set<string>();
    for (const r of availData?.data ?? []) {
      let cur = r.check_in;
      while (cur < r.check_out) {
        set.add(cur);
        cur = addDays(cur, 1);
      }
    }
    return set;
  }, [availData]);

  const { mutate, isPending } = useCreateBooking();

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const estTotal =
    typeof pricePerNight === "number" && nights > 0 ? pricePerNight * nights : null;

  const rangeHasBookedNight = useCallback(
    (from: string, toExclusive: string) => {
      let cur = from;
      while (cur < toExclusive) {
        if (bookedNights.has(cur)) return true;
        cur = addDays(cur, 1);
      }
      return false;
    },
    [bookedNights],
  );

  const onDayPress = (day: string) => {
    if (day < today || bookedNights.has(day)) return;
    Haptics.selectionAsync();
    setError(null);
    setConfirmed(false);
    // Start (or restart) a selection.
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    // Second tap: earlier-or-same restarts; a clean forward span sets checkout.
    if (day <= checkIn) {
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    if (rangeHasBookedNight(checkIn, day)) {
      // The span crosses a taken night — treat the new tap as a fresh check-in.
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    setCheckOut(day);
  };

  const shiftMonth = (delta: number) => {
    Haptics.selectionAsync();
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const onReserve = () => {
    if (!checkIn || !checkOut || nights < 1 || isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    mutate(
      { id: listingId, data: { check_in: checkIn, check_out: checkOut, guests } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setConfirmed(true);
          // Brand answer: the header B-OOM mark pops once for a real booking.
          pulseSpark();
          // Fresh availability so the just-booked nights grey out immediately.
          queryClient.invalidateQueries({
            queryKey: getGetListingAvailabilityQueryKey(listingId),
          });
        },
        onError: () => {
          // Most often the dates were taken between load and tap; refetch so the
          // calendar reflects reality, and ask the guest to pick again.
          setError(t("booking.errorTaken"));
          queryClient.invalidateQueries({
            queryKey: getGetListingAvailabilityQueryKey(listingId),
          });
          setCheckOut(null);
        },
      },
    );
  };

  // Build the visible month grid (leading blanks + day cells).
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const lead = first.getDay(); // 0 = Sunday
    const out: (string | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(ymd(new Date(cursor.year, cursor.month, d)));
    return out;
  }, [cursor]);

  const monthTitle = `${(isRTL ? MONTHS_AR : MONTHS_EN)[cursor.month]} ${cursor.year}`;
  const weekLabels = isRTL ? WEEK_AR : WEEK_EN;
  const rowDir = isRTL ? "row-reverse" : "row";
  const currency = t("booking.currency");
  // Can we page back? Never before the current month.
  const atCurrentMonth =
    cursor.year === new Date().getFullYear() && cursor.month === new Date().getMonth();

  const fmtDay = (s: string) => {
    const d = parseYmd(s);
    return `${d.getDate()} ${(isRTL ? MONTHS_AR : MONTHS_EN)[d.getMonth()]}`;
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
      ]}
      testID="booking-card"
    >
      <View style={[styles.headerRow, { flexDirection: rowDir }]}>
        <View style={[styles.titleWrap, { flexDirection: rowDir }]}>
          <Feather name="calendar" size={16} color={colors.primary} />
          <AppText style={[styles.title, { color: colors.foreground }]}>
            {t("booking.title")}
          </AppText>
        </View>
        {typeof pricePerNight === "number" ? (
          <AppText style={[styles.perNight, { color: colors.mutedForeground }]}>
            {group(pricePerNight)} {currency} / {t("booking.night")}
          </AppText>
        ) : null}
      </View>

      {confirmed ? (
        <View style={styles.confirmWrap} testID="booking-confirmed">
          <View style={[styles.confirmIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="check" size={26} color={colors.primary} />
          </View>
          <AppText style={[styles.confirmTitle, { color: colors.foreground }]}>
            {t("booking.confirmedTitle")}
          </AppText>
          <AppText style={[styles.confirmBody, { color: colors.mutedForeground }]}>
            {t("booking.confirmedBody")}
          </AppText>
        </View>
      ) : (
        <>
          {/* Month pager */}
          <View style={[styles.monthBar, { flexDirection: rowDir }]}>
            <Pressable
              onPress={() => shiftMonth(-1)}
              disabled={atCurrentMonth}
              hitSlop={8}
              style={styles.arrow}
              testID="booking-prev-month"
            >
              <Feather
                name={isRTL ? "chevron-right" : "chevron-left"}
                size={20}
                color={atCurrentMonth ? colors.border : colors.foreground}
              />
            </Pressable>
            <AppText style={[styles.monthTitle, { color: colors.foreground }]}>
              {monthTitle}
            </AppText>
            <Pressable
              onPress={() => shiftMonth(1)}
              hitSlop={8}
              style={styles.arrow}
              testID="booking-next-month"
            >
              <Feather
                name={isRTL ? "chevron-left" : "chevron-right"}
                size={20}
                color={colors.foreground}
              />
            </Pressable>
          </View>

          {/* Weekday header */}
          <View style={[styles.grid, { flexDirection: rowDir }]}>
            {weekLabels.map((w, i) => (
              <View key={`w${i}`} style={styles.cell}>
                <AppText style={[styles.weekLabel, { color: colors.mutedForeground }]}>
                  {w}
                </AppText>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={[styles.grid, { flexDirection: rowDir }]}>
            {cells.map((day, i) => {
              if (!day) return <View key={`b${i}`} style={styles.cell} />;
              const past = day < today;
              const booked = bookedNights.has(day);
              const disabled = past || booked;
              const isStart = day === checkIn;
              const isEnd = day === checkOut;
              const inRange =
                !!checkIn && !!checkOut && day > checkIn && day < checkOut;
              const selected = isStart || isEnd;
              return (
                <Pressable
                  key={day}
                  style={styles.cell}
                  onPress={() => onDayPress(day)}
                  disabled={disabled}
                  testID={`booking-day-${day}`}
                >
                  <View
                    style={[
                      styles.dayInner,
                      inRange && { backgroundColor: colors.primary + "1A" },
                      selected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <AppText
                      style={[
                        styles.dayText,
                        { color: colors.foreground },
                        disabled && { color: colors.border },
                        booked && styles.struck,
                        selected && { color: colors.primaryForeground, fontWeight: "700" },
                      ]}
                    >
                      {parseYmd(day).getDate()}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Guests stepper */}
          <View style={[styles.guestRow, { flexDirection: rowDir }]}>
            <AppText style={[styles.guestLabel, { color: colors.foreground }]}>
              {t("booking.guests")}
            </AppText>
            <View style={[styles.stepper, { flexDirection: rowDir }]}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setGuests((g) => Math.max(1, g - 1));
                }}
                disabled={guests <= 1}
                hitSlop={6}
                style={[styles.stepBtn, { borderColor: colors.border }]}
                testID="booking-guests-minus"
              >
                <Feather name="minus" size={16} color={guests <= 1 ? colors.border : colors.foreground} />
              </Pressable>
              <AppText style={[styles.guestCount, { color: colors.foreground }]}>{guests}</AppText>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setGuests((g) => Math.min(20, g + 1));
                }}
                disabled={guests >= 20}
                hitSlop={6}
                style={[styles.stepBtn, { borderColor: colors.border }]}
                testID="booking-guests-plus"
              >
                <Feather name="plus" size={16} color={guests >= 20 ? colors.border : colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Summary */}
          {checkIn ? (
            <View style={[styles.summary, { borderTopColor: colors.border }]}>
              <View style={[styles.summaryRow, { flexDirection: rowDir }]}>
                <AppText style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  {t("booking.dates")}
                </AppText>
                <AppText style={[styles.summaryValue, { color: colors.foreground }]}>
                  {checkOut ? `${fmtDay(checkIn)} — ${fmtDay(checkOut)}` : fmtDay(checkIn)}
                </AppText>
              </View>
              {nights > 0 ? (
                <View style={[styles.summaryRow, { flexDirection: rowDir }]}>
                  <AppText style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                    {t("booking.nights")}
                  </AppText>
                  <AppText style={[styles.summaryValue, { color: colors.foreground }]}>
                    {nights}
                  </AppText>
                </View>
              ) : null}
              {estTotal != null ? (
                <View style={[styles.summaryRow, { flexDirection: rowDir }]}>
                  <AppText style={[styles.totalLabel, { color: colors.foreground }]}>
                    {t("booking.estTotal")}
                  </AppText>
                  <AppText style={[styles.totalValue, { color: colors.primary }]}>
                    {group(estTotal)} {currency}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : (
            <AppText style={[styles.hint, { color: colors.mutedForeground }]}>
              {t("booking.pickHint")}
            </AppText>
          )}

          {error ? (
            <AppText style={[styles.errorText, { color: colors.destructive }]}>{error}</AppText>
          ) : null}

          <Pressable
            onPress={onReserve}
            disabled={!checkOut || nights < 1 || isPending}
            style={[
              styles.reserveBtn,
              {
                backgroundColor: !checkOut || nights < 1 ? colors.primary + "40" : colors.primary,
                borderRadius: colors.radius,
                flexDirection: rowDir,
              },
            ]}
            testID="booking-reserve"
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <>
                <Feather name="calendar" size={17} color={colors.primaryForeground} />
                <AppText style={[styles.reserveText, { color: colors.primaryForeground }]}>
                  {t("booking.reserve")}
                </AppText>
              </>
            )}
          </Pressable>
          <AppText style={[styles.noteText, { color: colors.mutedForeground }]}>
            {t("booking.requestNote")}
          </AppText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  headerRow: { alignItems: "center", justifyContent: "space-between" },
  titleWrap: { alignItems: "center", gap: 7 },
  title: { fontSize: 16, fontWeight: "700" },
  perNight: { fontSize: 13, fontWeight: "600" },
  monthBar: { alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  arrow: { padding: 4 },
  monthTitle: { fontSize: 15, fontWeight: "700" },
  grid: { flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", justifyContent: "center" },
  weekLabel: { fontSize: 11, fontWeight: "600", paddingVertical: 4 },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  dayText: { fontSize: 14 },
  struck: { textDecorationLine: "line-through" },
  guestRow: { alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  guestLabel: { fontSize: 14, fontWeight: "600" },
  stepper: { alignItems: "center", gap: 14 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  guestCount: { fontSize: 15, fontWeight: "700", minWidth: 18, textAlign: "center" },
  summary: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6, marginTop: 2 },
  summaryRow: { alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  totalLabel: { fontSize: 15, fontWeight: "700" },
  totalValue: { fontSize: 16, fontWeight: "800" },
  hint: { fontSize: 13, textAlign: "center", paddingVertical: 6 },
  errorText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  reserveBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  reserveText: { fontSize: 16, fontWeight: "700" },
  noteText: { fontSize: 11, textAlign: "center" },
  confirmWrap: { alignItems: "center", gap: 8, paddingVertical: 18 },
  confirmIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTitle: { fontSize: 17, fontWeight: "700" },
  confirmBody: { fontSize: 13, textAlign: "center", paddingHorizontal: 12 },
});
