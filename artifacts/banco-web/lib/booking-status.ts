/** Booking status styling — ported from banco-mobile bookings.tsx STATUS_META. */

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  requested: "#E0A106",
  confirmed: "#1FA97D",
  rejected: "#E0393B",
  cancelled: "#8A8A8E",
};

export function formatBookingMoney(n: number | null | undefined, currency: string): string | null {
  if (typeof n !== "number") return null;
  return `${Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${currency}`;
}
