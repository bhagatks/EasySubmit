const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<[^>]*>/g;

export function sanitizeString(
  value: unknown,
  maxLength = 500,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(CONTROL_CHARS, "")
    .replace(HTML_TAG, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeRequiredString(value: unknown, maxLength = 500): string {
  return sanitizeString(value, maxLength) ?? "";
}

export function sanitizeEmail(value: unknown): string | null {
  const cleaned = sanitizeString(value, 320)?.toLowerCase() ?? null;
  if (!cleaned) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : null;
}

export function sanitizeStringArray(
  values: unknown,
  maxItems = 64,
  maxItemLength = 120,
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of values) {
    const cleaned = sanitizeString(item, maxItemLength);
    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

export function sanitizeOptionalInt(
  value: unknown,
  min = 0,
  max = 1_000_000,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) {
    return null;
  }

  return rounded;
}
