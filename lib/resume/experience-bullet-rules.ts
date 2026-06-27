/**
 * Work experience bullet count rules — recency taper + hard export cap.
 * Canonical spec: docs/resume/RULES.md §4, §6.3, §8
 */

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

export const MAX_BULLETS_PER_ROLE = 6;

export const RECENT_ROLE_MIN_BULLETS = 3;
export const MID_ROLE_MIN_BULLETS = 2;
export const OLDER_ROLE_MIN_BULLETS = 1;

export type ExperienceRecencyTier = "recent" | "mid" | "older";

export type ExperienceBulletBudget = {
  tier: ExperienceRecencyTier;
  min: number;
  targetMin: number;
  targetMax: number;
  max: number;
};

export function getExperienceRecencyTier(roleIndexAmongVisible: number): ExperienceRecencyTier {
  if (roleIndexAmongVisible <= 0) return "recent";
  if (roleIndexAmongVisible === 1) return "mid";
  return "older";
}

export function resolveExperienceBulletBudget(
  roleIndexAmongVisible: number,
  pages: 1 | 2 = 1,
): ExperienceBulletBudget {
  const tier = getExperienceRecencyTier(roleIndexAmongVisible);

  if (tier === "recent") {
    return {
      tier,
      min: RECENT_ROLE_MIN_BULLETS,
      targetMin: 4,
      targetMax: 5,
      max: pages === 2 ? MAX_BULLETS_PER_ROLE : 5,
    };
  }

  if (tier === "mid") {
    return {
      tier,
      min: MID_ROLE_MIN_BULLETS,
      targetMin: 3,
      targetMax: 4,
      max: pages === 2 ? 4 : 3,
    };
  }

  return {
    tier,
    min: OLDER_ROLE_MIN_BULLETS,
    targetMin: 1,
    targetMax: 2,
    max: 2,
  };
}

export function countExperienceBullets(raw: string | string[] | null | undefined): number {
  if (!raw) return 0;
  if (Array.isArray(raw)) {
    return raw.map((b) => b.trim()).filter(Boolean).length;
  }
  return raw
    .split("\n")
    .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean).length;
}

export function formatExperienceBulletBudgetLines(pages: 1 | 2): string[] {
  const recent = resolveExperienceBulletBudget(0, pages);
  const mid = resolveExperienceBulletBudget(1, pages);
  const older = resolveExperienceBulletBudget(2, pages);

  return [
    `- Most recent role: ${recent.targetMin}–${recent.targetMax} bullets (${recent.min} minimum, ${recent.max} max).`,
    `- Second role: ${mid.targetMin}–${mid.targetMax} bullets (${mid.min} minimum, ${mid.max} max).`,
    `- Older roles: ${older.targetMin}–${older.targetMax} bullets (${older.min} minimum, ${older.max} max).`,
    `- Hard cap: never more than ${MAX_BULLETS_PER_ROLE} bullets under any single role.`,
  ];
}

export function buildExperienceBulletBudgetPrompt(pages: 1 | 2, maxRolesDetailed: number): string {
  return [
    "Experience bullet budget (by recency — trim oldest roles first):",
    ...formatExperienceBulletBudgetLines(pages),
    `- Include up to ${maxRolesDetailed} roles in detail.`,
  ].join("\n");
}

export type ExperienceBulletCountIssue = {
  roleIndex: number;
  tier: ExperienceRecencyTier;
  count: number;
  budget: ExperienceBulletBudget;
  kind: "below_min" | "above_recommended_max" | "above_hard_max";
};

export function auditExperienceBulletCounts(
  entries: Array<{ bullets?: string | string[] | null; hidden?: boolean }>,
  pages: 1 | 2 = 1,
): ExperienceBulletCountIssue[] {
  const issues: ExperienceBulletCountIssue[] = [];
  let visibleIndex = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry.hidden) continue;

    const count = countExperienceBullets(entry.bullets);
    const budget = resolveExperienceBulletBudget(visibleIndex, pages);

    if (count > MAX_BULLETS_PER_ROLE) {
      issues.push({
        roleIndex: i,
        tier: budget.tier,
        count,
        budget,
        kind: "above_hard_max",
      });
    } else if (count > budget.max) {
      issues.push({
        roleIndex: i,
        tier: budget.tier,
        count,
        budget,
        kind: "above_recommended_max",
      });
    } else if (count < budget.min) {
      issues.push({
        roleIndex: i,
        tier: budget.tier,
        count,
        budget,
        kind: "below_min",
      });
    }

    visibleIndex += 1;
  }

  return issues;
}

export function messageForBelowMinIssue(
  roleNumber: number,
  issue: ExperienceBulletCountIssue,
): string {
  return `Role ${roleNumber}: add at least ${issue.budget.min} bullets (aim for ${issue.budget.targetMin}–${issue.budget.targetMax} for your ${issue.tier} role).`;
}

export function messageForAboveMaxIssue(
  title: string,
  issue: ExperienceBulletCountIssue,
): string {
  if (issue.kind === "above_hard_max") {
    return `"${title}" has ${issue.count} bullets — only the first ${MAX_BULLETS_PER_ROLE} export (RULES.md §8). Trim in Studio before applying.`;
  }
  return `"${title}" has ${issue.count} bullets — aim for ${issue.budget.targetMin}–${issue.budget.targetMax} (${issue.tier} role; max ${issue.budget.max}).`;
}

function parseBulletArray(raw: string): string[] {
  return raw
    .split("\n")
    .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

/** Trim bullets on each visible role to recency budget max (oldest roles lose bullets first). */
export function taperExperienceEntries(
  entries: HubRefineryForm["experience"],
  pages: 1 | 2,
): { entries: HubRefineryForm["experience"]; bulletsTrimmed: number } {
  let visibleIndex = 0;
  let bulletsTrimmed = 0;

  const next = entries.map((entry) => {
    if (entry.hidden) return entry;

    const budget = resolveExperienceBulletBudget(visibleIndex, pages);
    visibleIndex += 1;

    const parsed = parseBulletArray(entry.bullets ?? "");
    if (parsed.length <= budget.max) return entry;

    bulletsTrimmed += parsed.length - budget.max;
    return { ...entry, bullets: parsed.slice(0, budget.max).join("\n") };
  });

  return { entries: next, bulletsTrimmed };
}
