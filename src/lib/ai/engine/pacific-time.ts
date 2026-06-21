/** Calendar date in America/Los_Angeles as `YYYY-MM-DD`. */
export function getTodayPacificDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Instant when the next Pacific calendar day begins (00:00:00 PT). */
export function nextPacificMidnight(from = new Date()): Date {
  const todayPt = getTodayPacificDateString(from);
  let cursor = from.getTime() + 60_000;
  const max = from.getTime() + 48 * 3_600_000;

  while (cursor < max) {
    const pt = getTodayPacificDateString(new Date(cursor));
    if (pt !== todayPt) {
      let lo = from.getTime();
      let hi = cursor;
      while (hi - lo > 1_000) {
        const mid = Math.floor((lo + hi) / 2);
        if (getTodayPacificDateString(new Date(mid)) === pt) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      return new Date(hi);
    }
    cursor += 3_600_000;
  }

  throw new Error("Could not resolve next Pacific midnight");
}
