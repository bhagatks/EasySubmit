/**
 * Split experience entries when a PDF parser merges the next role into a bullet line.
 * Example: "...performance. CVS Health Sep2014–Dec2023 Director | Engineering Manager"
 */

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { parseDateRangeString } from "@/lib/resume/dates";
import { parseBulletLines } from "@/lib/job-tracker/export/resume-content-model";

const MONTH = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";

const EMBEDDED_HEADER_MASHED_RE = new RegExp(
  String.raw`(?:^|\.\s+)([A-Z][A-Za-z0-9\s&.'-]{1,60}?)\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)((?:19|20)\d{2})\s*[–-]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)((?:19|20)\d{2})|Present)\s+(.+)\s*$`,
  "i",
);

const EMBEDDED_HEADER_RE = new RegExp(
  String.raw`(?:^|\.\s+)([A-Z][A-Za-z0-9\s&.'-]{1,60}?)\s*((?:${MONTH})\s+(?:19|20)\d{2}\s*[–-]\s*(?:(?:${MONTH})\s+)?(?:19|20)\d{2}|Present)\s+(.+)\s*$`,
  "i",
);

export type EmbeddedExperienceHeader = {
  trimmedBullet: string;
  company: string;
  title: string;
  dateRange: string;
};

export function findEmbeddedExperienceHeaderInBullet(bullet: string): EmbeddedExperienceHeader | null {
  const trimmed = bullet.trim();
  if (!trimmed) return null;

  const mashed = EMBEDDED_HEADER_MASHED_RE.exec(trimmed);
  if (mashed && mashed.index !== undefined) {
    const company = mashed[1]?.trim() ?? "";
    const title = mashed[6]?.trim() ?? "";
    const dateRange = mashed[4]
      ? `${mashed[2]} ${mashed[3]} – ${mashed[4]} ${mashed[5]}`.trim()
      : `${mashed[2]} ${mashed[3]} – Present`.trim();
    if (company && title && dateRange) {
      return {
        trimmedBullet: trimmed.slice(0, mashed.index).trim().replace(/\.\s*$/, ""),
        company,
        title,
        dateRange,
      };
    }
  }

  const spaced = EMBEDDED_HEADER_RE.exec(trimmed);
  if (spaced && spaced.index !== undefined) {
    const company = spaced[1]?.trim() ?? "";
    const title = spaced[3]?.trim() ?? "";
    const dateRange = spaced[2]?.trim() ?? "";
    if (company && title && dateRange) {
      return {
        trimmedBullet: trimmed.slice(0, spaced.index).trim().replace(/\.\s*$/, ""),
        company,
        title,
        dateRange,
      };
    }
  }

  return null;
}

export function splitMashedExperienceInForm(form: HubRefineryForm): HubRefineryForm {
  const experience = form.experience ?? [];
  if (experience.length === 0) return form;

  const nextExperience: HubRefineryForm["experience"] = [];

  for (const entry of experience) {
    if (entry.hidden) {
      nextExperience.push(entry);
      continue;
    }

    const bullets = parseBulletLines(entry.bullets ?? "");
    if (bullets.length === 0) {
      nextExperience.push(entry);
      continue;
    }

    let splitIndex = -1;
    let splitInfo: EmbeddedExperienceHeader | null = null;

    for (let i = 0; i < bullets.length; i += 1) {
      const found = findEmbeddedExperienceHeaderInBullet(bullets[i]!);
      if (found) {
        splitIndex = i;
        splitInfo = found;
        break;
      }
    }

    if (splitIndex < 0 || !splitInfo) {
      nextExperience.push(entry);
      continue;
    }

    const keptBullets = bullets.slice(0, splitIndex);
    if (splitInfo.trimmedBullet) {
      keptBullets.push(splitInfo.trimmedBullet);
    }

    nextExperience.push({
      ...entry,
      bullets: keptBullets.join("\n"),
    });

    const tailBullets = bullets.slice(splitIndex + 1);
    const range = parseDateRangeString(splitInfo.dateRange);

    nextExperience.push({
      id: `${entry.id}-split-${nextExperience.length}`,
      title: splitInfo.title,
      company: splitInfo.company,
      location: entry.location ?? "",
      startMonth: range.start.month,
      startYear: range.start.year,
      endMonth: range.end.month,
      endYear: range.end.year,
      bullets: tailBullets.join("\n"),
      hidden: false,
    });
  }

  return { ...form, experience: nextExperience };
}
