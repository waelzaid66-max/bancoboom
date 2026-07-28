"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ListBookingsRole,
  UpdateBookingBodyAction,
  getListBookingsQueryKey,
  useListBookings,
  useUpdateBooking,
  type BookingListItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BOOKING_STATUS_COLORS, formatBookingMoney } from "../../lib/booking-status";
import { localeFromPathname, localizedPath } from "../../lib/hub-config";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  border: "none",
  borderRadius: 8,
  background: active ? "var(--banco-card)" : "transparent",
  color: active ? "var(--banco-fg)" : "var(--banco-muted)",
  padding: "0.5rem 0.75rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.88rem",
});

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "0.9rem 1rem",
};

const actionBtn: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--banco-fg)",
  padding: "0.35rem 0.65rem",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.82rem",
};

function statusLabel(status: string, copy: ReturnType<typeof workspaceUiCopy>): string {
  const map: Record<string, string> = {
    requested: copy.bookingsStatusRequested,
    confirmed: copy.bookingsStatusConfirmed,
    rejected: copy.bookingsStatusRejected,
    cancelled: copy.bookingsStatusCancelled,
  };
  return map[status] ?? status;
}

function BookingCard({
  booking,
  role,
  locale,
  copy,
  onAction,
  pendingId,
}: {
  booking: BookingListItem;
  role: ListBookingsRole;
  locale: ReturnType<typeof localeFromPathname>;
  copy: ReturnType<typeof workspaceUiCopy>;
  onAction: (id: string, action: UpdateBookingBodyAction) => void;
  pendingId: string | null;
}) {
  const listingHref = localizedPath(`/listing/${booking.listing_id}`, locale);
  const busy = pendingId === booking.id;
  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? BOOKING_STATUS_COLORS.requested;
  const total = formatBookingMoney(booking.total_price, booking.currency);
  const isHost = role === ListBookingsRole.host;
  const canConfirm = isHost && booking.status === "requested";
  const canReject = isHost && booking.status === "requested";
  const canCancel =
    !isHost && (booking.status === "requested" || booking.status === "confirmed");

  return (
    <article style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontWeight: 700, flex: 1 }}>{booking.listing_title}</p>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "0.2rem 0.5rem",
            borderRadius: 999,
            background: `${statusColor}1A`,
            color: statusColor,
          }}
        >
          {statusLabel(booking.status, copy)}
        </span>
      </div>

      <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem", color: "var(--banco-muted)" }}>
        {booking.check_in} → {booking.check_out} · {booking.nights} {copy.bookingsNights}
      </p>

      {booking.counterparty_name ? (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "var(--banco-muted)" }}>
          {isHost ? copy.bookingsGuest : copy.bookingsHost}: {booking.counterparty_name}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem", alignItems: "center" }}>
        {total ? <strong>{total}</strong> : null}
        <Link href={listingHref} style={{ ...actionBtn, textDecoration: "none" }}>
          {copy.bookingsViewListing}
        </Link>
        {busy ? (
          <span style={{ fontSize: "0.82rem", color: "var(--banco-muted)" }}>{copy.loading}</span>
        ) : (
          <>
            {canReject ? (
              <button type="button" style={{ ...actionBtn, color: "var(--banco-primary)" }} onClick={() => onAction(booking.id, UpdateBookingBodyAction.reject)}>
                {copy.bookingsReject}
              </button>
            ) : null}
            {canConfirm ? (
              <button
                type="button"
                style={{ ...actionBtn, background: "var(--banco-primary)", color: "#fff", borderColor: "var(--banco-primary)" }}
                onClick={() => onAction(booking.id, UpdateBookingBodyAction.confirm)}
              >
                {copy.bookingsConfirm}
              </button>
            ) : null}
            {canCancel ? (
              <button type="button" style={{ ...actionBtn, color: "var(--banco-primary)" }} onClick={() => onAction(booking.id, UpdateBookingBodyAction.cancel)}>
                {copy.bookingsCancel}
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

export function BookingsPanel({ initialRole }: { initialRole?: ListBookingsRole }) {
  const pathname = usePathname() ?? "/workspace/bookings";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const queryClient = useQueryClient();

  const [role, setRole] = useState<ListBookingsRole>(
    initialRole === ListBookingsRole.host ? ListBookingsRole.host : ListBookingsRole.guest,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);

  const query = useListBookings(
    { role },
    { query: { queryKey: getListBookingsQueryKey({ role }) } },
  );
  const updateBooking = useUpdateBooking();

  const rows = query.data?.data ?? [];

  const handleAction = (id: string, action: UpdateBookingBodyAction) => {
    setPendingId(id);
    updateBooking.mutate(
      { id, data: { action } },
      {
        onSettled: () => setPendingId(null),
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["listBookings"] });
          void queryClient.invalidateQueries({ queryKey: ["getListingAvailability"] });
        },
      },
    );
  };

  return (
    <>
      <h2 style={{ margin: "0 0 0.75rem" }}>{copy.bookingsTitle}</h2>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: "1rem",
          padding: 4,
          borderRadius: 12,
          background: "var(--banco-card)",
          border: "1px solid var(--banco-border)",
        }}
      >
        <button
          type="button"
          style={tabStyle(role === ListBookingsRole.guest)}
          onClick={() => setRole(ListBookingsRole.guest)}
        >
          {copy.bookingsTabTrips}
        </button>
        <button
          type="button"
          style={tabStyle(role === ListBookingsRole.host)}
          onClick={() => setRole(ListBookingsRole.host)}
        >
          {copy.bookingsTabRequests}
        </button>
      </div>

      {query.isLoading ? (
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      ) : query.isError ? (
        <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
          <p style={{ color: "var(--banco-muted)", margin: "0 0 0.75rem" }}>{copy.bookingsErrorBody}</p>
          <button type="button" style={actionBtn} onClick={() => void query.refetch()}>
            {copy.retry}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--banco-muted)", lineHeight: 1.7 }}>
          {role === ListBookingsRole.guest ? copy.bookingsEmptyTrips : copy.bookingsEmptyRequests}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {rows.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              role={role}
              locale={locale}
              copy={copy}
              onAction={handleAction}
              pendingId={pendingId}
            />
          ))}
        </div>
      )}
    </>
  );
}
