/** Date helpers ported from banco-mobile BookingCard — no external date library. */

export const MS_DAY = 86_400_000;

export function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  return ymd(new Date(parseYmd(s).getTime() + n * MS_DAY));
}

export function nightsBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / MS_DAY);
}

export function groupNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
export const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEK_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

export function buildMonthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const out: (string | null)[] = [];
  for (let i = 0; i < lead; i++) out.push(null);
  for (let d = 1; d <= daysInMonth; d++) out.push(ymd(new Date(year, month, d)));
  return out;
}

export function rangeHasBookedNight(
  from: string,
  toExclusive: string,
  bookedNights: Set<string>,
): boolean {
  let cur = from;
  while (cur < toExclusive) {
    if (bookedNights.has(cur)) return true;
    cur = addDays(cur, 1);
  }
  return false;
}

export function fmtDayLabel(s: string, isRtl: boolean): string {
  const d = parseYmd(s);
  const months = isRtl ? MONTHS_AR : MONTHS_EN;
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
