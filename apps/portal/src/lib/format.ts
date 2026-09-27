const dateFmt = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric" });

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}
const dateTimeFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** "2026-09-09" is a calendar date, so build it locally to avoid a UTC day shift. */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

export function formatDateTime(iso: string) {
  return dateTimeFmt.format(new Date(iso));
}

export function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

export function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}

export function shiftIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}

const longDateFmt = new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric" });

export function formatLongDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return longDateFmt.format(new Date(y, m - 1, d));
}

const timeFmt = new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" });

export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso));
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}