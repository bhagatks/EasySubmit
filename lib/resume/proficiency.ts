import { PROFICIENCY_LEVELS } from "@/src/lib/constants/languages";

export { PROFICIENCY_LEVELS };

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

const PROFICIENCY_SHORT_LABELS: Record<ProficiencyLevel, string> = {
  "Native or Bilingual": "Native",
  "Full Professional": "Full Professional",
  "Professional Working": "Professional",
  "Limited Working": "Limited",
  Elementary: "Elementary",
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
