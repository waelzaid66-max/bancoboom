"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import {
  getGetListingAvailabilityQueryKey,
  useCreateBooking,
  useGetListingAvailability,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  MONTHS_AR,
  MONTHS_EN,
  WEEK_AR,
  WEEK_EN,
  addDays,
  buildMonthCells,
  fmtDayLabel,
  groupNumber,
  nightsBetween,
  rangeHasBookedNight,
  ymd,
} from "../lib/booking-calendar";
import { isClerkConfigured, signInPath } from "../lib/clerk-config";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "0.9rem 1rem",
  marginTop: "1rem",
};

const btnStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.65rem 0.9rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.95rem",
  width: "100%",
  marginTop: "0.5rem",
};

type ListingBookingSectionProps = {
  listingId: string;
  pricePerNight?: number | null;
};

export function ListingBookingSection({ listingId, pricePerNight }: ListingBookingSectionProps) {
  const locale = useSearchLocale();
  const isRtl = locale === "ar";
  const copy = listingUiCopy(locale);
  const queryClient = useQueryClient();
  const clerkOn = isClerkConfigured();

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

  const availQuery = useGetListingAvailability(listingId, {
    query: {
      queryKey: getGetListingAvailabilityQueryKey(listingId),
      staleTime: 30_000,
      retry: 1,
    },
  });

  const bookedNights = useMemo(() => {
    const set = new Set<string>();
    for (const r of availQuery.data?.data ?? []) {
      let cur = r.check_in;
      while (cur < r.check_out) {
        set.add(cur);
        cur = addDays(cur, 1);
      }
    }
    return set;
  }, [availQuery.data?.data]);

  const createBooking = useCreateBooking();
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const estTotal =
    typeof pricePerNight === "number" && nights > 0 ? pricePerNight * nights : null;

  const rangeBooked = useCallback(
    (from: string, toExclusive: string) => rangeHasBookedNight(from, toExclusive, bookedNights),
    [bookedNights],
  );

  const onDayPress = (day: string) => {
    if (day < today || bookedNights.has(day)) return;
    setError(null);
    setConfirmed(false);
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    if (day <= checkIn) {
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    if (rangeBooked(checkIn, day)) {
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    setCheckOut(day);
  };

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const onReserve = () => {
    if (!checkIn || !checkOut || nights < 1 || createBooking.isPending) return;
    setError(null);
    createBooking.mutate(
      { id: listingId, data: { check_in: checkIn, check_out: checkOut, guests } },
      {
        onSuccess: () => {
          setConfirmed(true);
          void queryClient.invalidateQueries({
            queryKey: getGetListingAvailabilityQueryKey(listingId),
          });
        },
        onError: () => {
          setError(copy.bookingErrorTaken);
          void queryClient.invalidateQueries({
            queryKey: getGetListingAvailabilityQueryKey(listingId),
          });
          setCheckOut(null);
        },
      },
    );
  };

  const cells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );
  const months = isRtl ? MONTHS_AR : MONTHS_EN;
  const monthTitle = `${months[cursor.month]} ${cursor.year}`;
  const weekLabels = isRtl ? WEEK_AR : WEEK_EN;
  const atCurrentMonth =
    cursor.year === new Date().getFullYear() && cursor.month === new Date().getMonth();

  const calendarBody = confirmed ? (
    <div style={{ textAlign: "center", padding: "1rem 0" }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "rgba(232,0,45,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 0.65rem",
          fontSize: "1.5rem",
        }}
      >
        ✓
      </div>
      <p style={{ margin: 0, fontWeight: 700 }}>{copy.bookingConfirmedTitle}</p>
      <p style={{ margin: "0.5rem 0 0", color: "var(--banco-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
        {copy.bookingConfirmedBody}
      </p>
    </div>
  ) : (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: isRtl ? "row-reverse" : "row",
          marginBottom: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={atCurrentMonth}
          style={{
            border: "none",
            background: "transparent",
            cursor: atCurrentMonth ? "default" : "pointer",
            opacity: atCurrentMonth ? 0.35 : 1,
            fontSize: "1.1rem",
          }}
          aria-label="Previous month"
        >
          {isRtl ? "›" : "‹"}
        </button>
        <strong>{monthTitle}</strong>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "1.1rem" }}
          aria-label="Next month"
        >
          {isRtl ? "‹" : "›"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          direction: isRtl ? "rtl" : "ltr",
        }}
      >
        {weekLabels.map((w) => (
          <span
            key={w}
            style={{
              textAlign: "center",
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--banco-muted)",
              padding: "0.25rem 0",
            }}
          >
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`b${i}`} />;
          const past = day < today;
          const booked = bookedNights.has(day);
          const disabled = past || booked;
          const isStart = day === checkIn;
          const isEnd = day === checkOut;
          const inRange = !!checkIn && !!checkOut && day > checkIn && day < checkOut;
          const selected = isStart || isEnd;
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onDayPress(day)}
              style={{
                border: "none",
                background: selected
                  ? "var(--banco-primary)"
                  : inRange
                    ? "rgba(232,0,45,0.1)"
                    : "transparent",
                color: selected ? "#fff" : disabled ? "var(--banco-border)" : "var(--banco-fg)",
                borderRadius: "50%",
                width: 34,
                height: 34,
                margin: "2px auto",
                cursor: disabled ? "default" : "pointer",
                fontWeight: selected ? 700 : 400,
                textDecoration: booked ? "line-through" : "none",
                fontSize: "0.88rem",
              }}
            >
              {day.split("-")[2]?.replace(/^0/, "")}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: isRtl ? "row-reverse" : "row",
          marginTop: "0.65rem",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{copy.bookingGuests}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            disabled={guests <= 1}
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "1px solid var(--banco-border)",
              background: "transparent",
              cursor: guests <= 1 ? "default" : "pointer",
            }}
          >
            −
          </button>
          <span style={{ fontWeight: 700, minWidth: 18, textAlign: "center" }}>{guests}</span>
          <button
            type="button"
            disabled={guests >= 20}
            onClick={() => setGuests((g) => Math.min(20, g + 1))}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "1px solid var(--banco-border)",
              background: "transparent",
              cursor: guests >= 20 ? "default" : "pointer",
            }}
          >
            +
          </button>
        </div>
      </div>

      {checkIn ? (
        <div style={{ borderTop: "1px solid var(--banco-border)", paddingTop: "0.65rem", marginTop: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexDirection: isRtl ? "row-reverse" : "row",
              fontSize: "0.88rem",
            }}
          >
            <span style={{ color: "var(--banco-muted)" }}>{copy.bookingDates}</span>
            <span style={{ fontWeight: 600 }}>
              {checkOut
                ? `${fmtDayLabel(checkIn, isRtl)} — ${fmtDayLabel(checkOut, isRtl)}`
                : fmtDayLabel(checkIn, isRtl)}
            </span>
          </div>
          {nights > 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexDirection: isRtl ? "row-reverse" : "row",
                fontSize: "0.88rem",
                marginTop: "0.35rem",
              }}
            >
              <span style={{ color: "var(--banco-muted)" }}>{copy.bookingNights}</span>
              <span style={{ fontWeight: 600 }}>{nights}</span>
            </div>
          ) : null}
          {estTotal != null ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexDirection: isRtl ? "row-reverse" : "row",
                marginTop: "0.35rem",
              }}
            >
              <span style={{ fontWeight: 700 }}>{copy.bookingEstimate}</span>
              <span style={{ fontWeight: 800, color: "var(--banco-primary)" }}>
                {groupNumber(estTotal)} {copy.bookingCurrency}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <p style={{ margin: "0.5rem 0 0", textAlign: "center", color: "var(--banco-muted)", fontSize: "0.85rem" }}>
          {copy.bookingPickHint}
        </p>
      )}

      {error ? (
        <p style={{ margin: "0.5rem 0 0", color: "var(--banco-primary)", fontSize: "0.85rem", textAlign: "center" }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        style={{
          ...btnStyle,
          opacity: !checkOut || nights < 1 ? 0.45 : 1,
          cursor: !checkOut || nights < 1 ? "default" : "pointer",
        }}
        disabled={!checkOut || nights < 1 || createBooking.isPending}
        onClick={onReserve}
      >
        {createBooking.isPending ? copy.bookingSubmitting : copy.bookingReserve}
      </button>
      <p style={{ margin: "0.35rem 0 0", textAlign: "center", color: "var(--banco-muted)", fontSize: "0.75rem" }}>
        {copy.bookingRequestNote}
      </p>
    </>
  );

  return (
    <section style={cardStyle} aria-label={copy.bookingTitle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: isRtl ? "row-reverse" : "row",
          marginBottom: "0.5rem",
        }}
      >
        <strong style={{ fontSize: "1rem" }}>{copy.bookingTitle}</strong>
        {typeof pricePerNight === "number" ? (
          <span style={{ fontSize: "0.85rem", color: "var(--banco-muted)", fontWeight: 600 }}>
            {groupNumber(pricePerNight)} {copy.bookingCurrency} / {copy.bookingNight}
          </span>
        ) : null}
      </div>

      {clerkOn ? (
        <>
          <SignedIn>{calendarBody}</SignedIn>
          <SignedOut>
            <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              {copy.bookingSignIn}
            </p>
            <Link href={signInPath(locale)} style={{ ...btnStyle, display: "inline-block", width: "auto" }}>
              {copy.contactSignIn}
            </Link>
          </SignedOut>
        </>
      ) : (
        <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>{copy.contactAppHint}</p>
      )}
    </section>
  );
}
