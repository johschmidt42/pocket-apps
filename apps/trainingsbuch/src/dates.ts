/** The local day of `now` as ISO date ("2026-11-17"). */
export function isoDay(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${String(now.getFullYear())}-${month}-${day}`;
}

/** "17.11.26": short enough for the axis of a chart. */
export function formatAxisDay(iso: string): string {
  return formatShortDay(iso).replace(/\.\d\d(\d\d)$/, ".$1");
}

/** "17.11.2026". */
export function formatShortDay(iso: string): string {
  const [year = "", month = "", day = ""] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** "Di., 17.11.2026". */
export function formatDay(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
