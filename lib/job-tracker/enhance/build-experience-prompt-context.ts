/**
 * Slim experience payload for resume AI — recency tiers + deterministic fact ledger.
 * Full bullets stay in memory for post-AI grounding; only this shape goes in the prompt.
 */

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  getExperienceRecencyTier,
  resolveExperienceBulletBudget,
} from "@/lib/resume/experience-bullet-rules";
import { MASTER_SKILLS } from "@/src/lib/constants/skills";
import { tokenizeJobText } from "@/lib/job-tracker/jd/keyword-extract";

const MASTER_SKILL_LOWER = new Set(MASTER_SKILLS.map((s) => s.toLowerCase()));

const METRIC_RE =
  /(?:\$[\d,.]+[kmb]?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s*(?:x|×)|(?:team of|led|managed)\s+\d+|\d+\+?\s*(?:people|engineers|users|customers|clients|employees))/gi;

function splitBullets(raw: string | undefined): string[] {
  return (raw ?? "")
    .split("\n")
    .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

function extractFactLines(bullet: string): string[] {
  const facts: string[] = [];
  const metrics = bullet.match(METRIC_RE) ?? [];
  for (const m of metrics) {
    const t = m.trim();
    if (t && !facts.includes(t)) facts.push(t);
  }

  const tokens = tokenizeJobText(bullet);
  for (const token of tokens) {
    if (MASTER_SKILL_LOWER.has(token) && !facts.some((f) => f.toLowerCase() === token)) {
      facts.push(token);
    }
  }

  if (facts.length === 0) {
    const words = bullet.split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
    if (words) facts.push(words);
  }

  return facts;
}

function factBudgetForTier(tier: "recent" | "mid" | "older", pages: 1 | 2): number {
  if (tier === "recent") return pages === 2 ? 8 : 6;
  if (tier === "mid") return pages === 2 ? 4 : 3;
  return 2;
}

/**
 * Compress experience bullets into per-role fact lines for the resume AI prompt.
 * Preserves ids, titles, companies, dates — only `bullets` is replaced with facts.
 */
export function buildExperiencePromptContext(
  experience: HubRefineryForm["experience"],
  pages: 1 | 2 = 1,
): HubRefineryForm["experience"] {
  const visible = experience.filter((e) => !e.hidden);
  let visibleIndex = 0;

  return experience.map((entry) => {
    if (entry.hidden) return entry;

    const tier = getExperienceRecencyTier(visibleIndex);
    visibleIndex += 1;
    const budget = factBudgetForTier(tier, pages);
    const bullets = splitBullets(entry.bullets);
    const facts: string[] = [];
    const seen = new Set<string>();

    for (const bullet of bullets) {
      for (const fact of extractFactLines(bullet)) {
        const key = fact.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        facts.push(fact);
        if (facts.length >= budget) break;
      }
      if (facts.length >= budget) break;
    }

    // Recent role: if few facts, keep short bullet previews as fallback
    if (tier === "recent" && facts.length < 2) {
      for (const bullet of bullets.slice(0, resolveExperienceBulletBudget(0, pages).targetMax)) {
        const preview = bullet.slice(0, 100);
        const key = preview.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        facts.push(preview);
        if (facts.length >= budget) break;
      }
    }

    return {
      ...entry,
      bullets: facts.join("\n"),
    };
  });
}

/** Full experience text for post-AI grounding (never use slim context here). */
export function experienceSourceBlob(
  experience: HubRefineryForm["experience"],
): string {
  return experience
    .filter((e) => !e.hidden)
    .map((e) => `${e.title ?? ""} ${e.company ?? ""} ${e.bullets ?? ""}`)
    .join("\n");
}
