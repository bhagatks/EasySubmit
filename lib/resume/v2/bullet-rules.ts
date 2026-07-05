import type { BulletRulesV2, BulletTierRulesV2 } from "@/lib/resume/v2/rules-config";

export type ExperienceRecencyTierV2 = "recent" | "mid" | "older";

export type BulletLineIssueV2 = {
  roleIndex: number;
  roleTitle: string;
  bulletIndex: number;
  charCount: number;
};

export type BulletCountIssueV2 = {
  roleIndex: number;
  roleTitle: string;
  tier: ExperienceRecencyTierV2;
  count: number;
  tierRules: BulletTierRulesV2;
};

export type BulletsValidationV2 = {
  countIssues: BulletCountIssueV2[];
  longLineIssues: BulletLineIssueV2[];
  warnings: string[];
  errors: string[];
};

export function getExperienceRecencyTierV2(roleIndexAmongVisible: number): ExperienceRecencyTierV2 {
  if (roleIndexAmongVisible <= 0) return "recent";
  if (roleIndexAmongVisible === 1) return "mid";
  return "older";
}

export function countExperienceBulletsV2(raw: string | null | undefined): number {
  if (!raw?.trim()) return 0;
  return raw
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean).length;
}

export function parseExperienceBulletsV2(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

function tierRulesForIndex(
  roleIndexAmongVisible: number,
  rules: BulletRulesV2,
): { tier: ExperienceRecencyTierV2; tierRules: BulletTierRulesV2 } {
  const tier = getExperienceRecencyTierV2(roleIndexAmongVisible);
  return { tier, tierRules: rules.tiers[tier] };
}

export type ValidateExperienceBulletsV2Options = {
  unlimitedContent?: boolean;
};

function tierBudgetIsUnlimited(tierRules: BulletTierRulesV2): boolean {
  return tierRules.warnAbove >= 500;
}

export function validateExperienceBulletsV2(
  entries: Array<{
    title?: string;
    bullets?: string | null;
    hidden?: boolean;
  }>,
  rules: BulletRulesV2,
  options: ValidateExperienceBulletsV2Options = {},
): BulletsValidationV2 {
  const unlimitedContent = options.unlimitedContent === true;
  const countIssues: BulletCountIssueV2[] = [];
  const longLineIssues: BulletLineIssueV2[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  let visibleIndex = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry.hidden) continue;

    const { tier, tierRules } = tierRulesForIndex(visibleIndex, rules);
    visibleIndex += 1;

    const title = entry.title?.trim() || `Role ${i + 1}`;
    const bullets = parseExperienceBulletsV2(entry.bullets ?? "");
    const count = bullets.length;

    if (!unlimitedContent && !tierBudgetIsUnlimited(tierRules)) {
      if (count > tierRules.warnAbove) {
        countIssues.push({ roleIndex: i, roleTitle: title, tier, count, tierRules });
        warnings.push(
          `"${title}" has ${count} bullets (${tier} role) — target ${tierRules.targetMin}–${tierRules.targetMax}, warn above ${tierRules.warnAbove}.`,
        );
      } else if (count > tierRules.targetMax || count < tierRules.targetMin) {
        warnings.push(
          `"${title}" has ${count} bullets (${tier} role) — target ${tierRules.targetMin}–${tierRules.targetMax}.`,
        );
      }
    }

    bullets.forEach((bullet, bulletIndex) => {
      if (bullet.length > rules.warnCharLengthAbove) {
        longLineIssues.push({
          roleIndex: i,
          roleTitle: title,
          bulletIndex,
          charCount: bullet.length,
        });
        warnings.push(
          `Bullet ${bulletIndex + 1} in "${title}" is ${bullet.length} characters — target ~${rules.targetWordsMin}–${rules.targetWordsMax} words (warn above ${rules.warnCharLengthAbove} chars).`,
        );
      }
    });
  }

  return { countIssues, longLineIssues, warnings, errors };
}
