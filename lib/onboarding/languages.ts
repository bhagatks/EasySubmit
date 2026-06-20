import type { LanguageEntry } from "@/stores/onboardingStore";
import { PROFICIENCY_LEVELS } from "@/src/lib/constants/languages";

const PROFICIENCY_SHORT_LABELS: Record<(typeof PROFICIENCY_LEVELS)[number], string> = {
  "Native or Bilingual": "Native",
  "Full Professional": "Full Professional",
  "Professional Working": "Professional",
  "Limited Working": "Limited",
  "Elementary": "Elementary",
};

/** Chip-friendly proficiency label — e.g. `Native or Bilingual` → `Native`. */
export function formatProficiencyShort(level: string): string {
  const trimmed = level.trim();
  if (!trimmed) return "";

  const match = PROFICIENCY_LEVELS.find(
    (entry) => entry.toLowerCase() === trimmed.toLowerCase(),
  );

  return match ? PROFICIENCY_SHORT_LABELS[match] : trimmed;
}

/** Chip display — e.g. `English (Native)`. */
export function formatLanguageChipLabel(entry: LanguageEntry): string {
  const name = entry.name.trim();
  const level = formatProficiencyShort(entry.level);
  if (!name) return "";
  return level ? `${name} (${level})` : name;
}

/** At least one language with name and proficiency level. */
export function hasRequiredLanguages(languages: LanguageEntry[]): boolean {
  return languages.some(
    (entry) => entry.name.trim().length > 0 && entry.level.trim().length > 0,
  );
}

/** ATS Languages section lines — `Language — Proficiency`. */
export function formatLanguagesForResume(languages: LanguageEntry[]): string[] {
  return languages
    .filter(
      (entry) => entry.name.trim().length > 0 && entry.level.trim().length > 0,
    )
    .map((entry) => `${entry.name.trim()} — ${entry.level.trim()}`);
}

export function selectHasRequiredLanguages(
  state: Pick<{ languages: LanguageEntry[] }, "languages">,
): boolean {
  return hasRequiredLanguages(state.languages);
}
