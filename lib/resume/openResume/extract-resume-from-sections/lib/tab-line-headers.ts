import type { Line, Lines, TextItem } from "@/lib/resume/openResume/types";
import {
  extractTrailingDateRange,
  lineHasDateText,
} from "@/lib/resume/dates";

/** Minimum horizontal gap (pt) between left/right tab clusters. */
const TAB_GAP_THRESHOLD = 36;

export type TabLineSplit = {
  left: string;
  right: string;
};

export { lineHasDateText };

/**
 * Split a PDF line into left (title/degree) and right (date) clusters using x-positions.
 * Matches ATS tab-stop layouts — see EASYSUBMIT_RESUME_RULES.md (repo root) §4.
 */
export function splitTabLine(line: Line): TabLineSplit | null {
  if (line.length < 2) return null;

  const sorted = [...line].sort((a, b) => a.x - b.x);
  let maxGap = 0;
  let splitAt = -1;

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].x + sorted[i - 1].width;
    const gap = sorted[i].x - prevEnd;
    if (gap > maxGap) {
      maxGap = gap;
      splitAt = i;
    }
  }

  if (splitAt <= 0 || maxGap < TAB_GAP_THRESHOLD) return null;

  const left = joinItems(sorted.slice(0, splitAt));
  const right = joinItems(sorted.slice(splitAt));
  if (!left || !right) return null;

  if (lineHasDateText(right)) return { left, right };
  if (lineHasDateText(left)) return { left: right, right: left };

  return null;
}

function joinItems(items: TextItem[]): string {
  return items
    .map((item) => item.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse "Company | City, State" or "Company City/Region, ST" on one line. */
export function splitPipeCompanyLocation(line: string): {
  company: string;
  location: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.includes("|")) {
    const parts = trimmed
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < 2) return null;
    if (lineHasDateText(parts[parts.length - 1]) && parts.length === 2) {
      return null;
    }

    return {
      company: parts[0],
      location: parts.slice(1).join(" | "),
    };
  }

  const spacedLocation = trimmed.match(
    /^(.+?)\s+([A-Za-z][A-Za-z\s/.-]+,\s*[A-Z]{2}(?:\/[A-Za-z]{2,})?)$/,
  );
  if (spacedLocation) {
    return {
      company: spacedLocation[1].trim(),
      location: spacedLocation[2].trim(),
    };
  }

  return null;
}

/** Parse "Company — City, State" into company + location. */
export function splitCompanyLocation(line: string): {
  company: string;
  location: string;
} {
  const trimmed = line.trim();
  const parts = trimmed.split(/\s+[—–-]\s+/);
  if (parts.length >= 2) {
    return {
      company: parts[0].trim(),
      location: parts.slice(1).join(" — ").trim(),
    };
  }
  return { company: trimmed, location: "" };
}

export function firstNonBulletHeaderLine(lines: Lines, startIdx: number): number {
  for (let i = startIdx; i < lines.length; i++) {
    const text = joinItems(lines[i]);
    if (!text) continue;
    if (/^[•∙●○\-–—]\s?/.test(text)) continue;
    return i;
  }
  return startIdx;
}

export { extractTrailingDateRange };
