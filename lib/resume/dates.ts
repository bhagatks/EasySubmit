/** Month/year date helpers for resume fields (ATS format: MMM YYYY). */

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTH_OPTIONS = [
  { value: "", label: "Month" },
  ...MONTHS.map((month) => ({ value: month, label: month })),
];

export type MonthYear = {
  month: string;
  year: string;
};

export type DateRangeParts = {
  start: MonthYear;
  end: MonthYear;
};

const MONTH_PATTERN =
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i;

const YEAR_PATTERN = /(?:19|20)\d{2}/;

const RANGE_SPLIT = /\s*(?:[-–—~]|to)\s*/i;

const PRESENT_PATTERN = /^(present|current|now)$/i;

function normalizeMonthToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const match = trimmed.match(MONTH_PATTERN);
  if (!match) return "";

  const token = match[0].slice(0, 3);
  const found = MONTHS.find((month) => month.toLowerCase() === token.toLowerCase());
  return found ?? "";
}

function parseMonthYearPart(part: string): MonthYear {
  const trimmed = part.trim();
  if (!trimmed) return { month: "", year: "" };

  if (PRESENT_PATTERN.test(trimmed)) {
    return { month: "", year: "Present" };
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const monthIndex = Number.parseInt(slashMatch[1], 10) - 1;
    const month = MONTHS[monthIndex] ?? "";
    return { month, year: slashMatch[2] };
  }

  const yearMatch = trimmed.match(YEAR_PATTERN);
  const year = yearMatch?.[0] ?? "";
  const month = normalizeMonthToken(trimmed.replace(year, ""));

  if (!month && year) {
    return { month: "", year };
  }

  return { month, year };
}

/** Parse a stored date range string into start/end month-year parts. */
export function parseDateRangeString(value: string | null | undefined): DateRangeParts {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return {
      start: { month: "", year: "" },
      end: { month: "", year: "" },
    };
  }

  const parts = trimmed.split(RANGE_SPLIT).map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      start: parseMonthYearPart(parts[0]),
      end: parseMonthYearPart(parts.slice(1).join(" ")),
    };
  }

  const single = parseMonthYearPart(trimmed);
  return {
    start: single,
    end: { month: "", year: "" },
  };
}

/** Format month-year parts as `MMM YYYY – MMM YYYY` (or year-only fallback). */
export function formatMonthYear(part: MonthYear): string {
  const month = part.month.trim();
  const year = part.year.trim();
  if (!year) return "";
  if (PRESENT_PATTERN.test(year)) return "Present";
  if (month) return `${month} ${year}`;
  return year;
}

export function formatDateRangeParts(range: DateRangeParts): string {
  const start = formatMonthYear(range.start);
  const end = formatMonthYear(range.end);

  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function dateRangeFromParts(range: DateRangeParts): string {
  return formatDateRangeParts(range);
}

export function lineHasDateText(text: string): boolean {
  return /(?:19|20)\d{2}|Present|Current|Now|\d{1,2}\/\d{4}|\d{1,2}-\d{4}/i.test(
    text,
  );
}

/** Extract trailing date range from a job header line. */
export function extractTrailingDateRange(line: string): {
  title: string;
  date: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const endRange = trimmed.match(
    /^(.*?\S)\s+((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}\s*[–-]\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}|Present))\s*$/i,
  );
  if (endRange) {
    return {
      title: endRange[1].replace(/\|\s*$/, "").trim(),
      date: endRange[2].trim(),
    };
  }

  if (trimmed.includes("|")) {
    const parts = trimmed.split("|").map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    if (parts.length >= 2 && /(?:19|20)\d{2}\s*[–-]/.test(last)) {
      return {
        title: parts.slice(0, -1).join(" | "),
        date: last,
      };
    }
  }

  const match = trimmed.match(
    /(.+?)\s*[|–—-]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[–-]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|(?:19|20)\d{4}|Present)|(?:19|20)\d{4}\s*[–-]\s*(?:(?:19|20)\d{4}|Present))\s*$/i,
  );

  if (match) {
    return {
      title: match[1].replace(/\|\s*$/, "").trim(),
      date: match[2].trim(),
    };
  }

  const yearOnly = trimmed.match(
    /(.+?)\s*[|–—-]\s*((?:19|20)\d{4}\s*[–-]\s*(?:(?:19|20)\d{4}|Present))\s*$/i,
  );
  if (yearOnly) {
    return {
      title: yearOnly[1].replace(/\|\s*$/, "").trim(),
      date: yearOnly[2].trim(),
    };
  }

  return null;
}

/** Split `City, State & 75078` or legacy `City, State (75078)` into city/state/zip. */
export function parseLocationLabel(label: string): {
  city: string;
  state: string;
  zip: string;
} {
  const trimmed = label.trim();
  if (!trimmed) return { city: "", state: "", zip: "" };

  const ampZip = trimmed.match(/^(.+?),\s*(.+?)\s*&\s*(\d{5}(?:-\d{4})?)$/i);
  if (ampZip) {
    return {
      city: ampZip[1].trim(),
      state: ampZip[2].trim(),
      zip: ampZip[3].trim(),
    };
  }

  const parenZip = trimmed.match(/^(.+?),\s*(.+?)\s*\((\d{5}(?:-\d{4})?)\)$/i);
  if (parenZip) {
    return {
      city: parenZip[1].trim(),
      state: parenZip[2].trim(),
      zip: parenZip[3].trim(),
    };
  }

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length >= 2) {
    return { city: parts[0], state: parts.slice(1).join(", "), zip: "" };
  }

  return { city: trimmed, state: "", zip: "" };
}

export function formatLocationLabel(city: string, state: string, zip: string): string {
  const cityTrim = city.trim();
  const stateTrim = state.trim();
  const zipTrim = zip.trim();

  if (cityTrim && stateTrim && zipTrim) {
    return `${cityTrim}, ${stateTrim} & ${zipTrim}`;
  }
  if (cityTrim && stateTrim) {
    return `${cityTrim}, ${stateTrim}`;
  }
  if (cityTrim && zipTrim) {
    return `${cityTrim} & ${zipTrim}`;
  }
  return cityTrim;
}
