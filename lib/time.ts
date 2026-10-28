const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function manilaYYMM(d: Date): string {
  const m = new Date(d.getTime() + MANILA_OFFSET_MS);
  return String(m.getUTCFullYear() % 100).padStart(2, "0") + String(m.getUTCMonth() + 1).padStart(2, "0");
}

export function manilaDayRange(d: Date): { start: string; end: string } {
  const startMs = Math.floor((d.getTime() + MANILA_OFFSET_MS) / DAY_MS) * DAY_MS - MANILA_OFFSET_MS;
  return { start: new Date(startMs).toISOString(), end: new Date(startMs + DAY_MS).toISOString() };
}

/** The calendar date in Manila as YYYY-MM-DD, optionally some days ahead. */
export function manilaDate(d: Date, addDays = 0): string {
  return new Date(d.getTime() + MANILA_OFFSET_MS + addDays * DAY_MS).toISOString().slice(0, 10);
}

/** "2026-10-06" -> "Tue, 6 Oct 2026". Parsed at noon Manila so the day never shifts. */
export function formatDateOnly(ymd: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${ymd}T12:00:00+08:00`))
    .replace(/(\w{3}) (\d+) (\w{3}) (\d{4})/, "$1, $2 $3 $4");
}

export function formatManila(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(iso));
}
