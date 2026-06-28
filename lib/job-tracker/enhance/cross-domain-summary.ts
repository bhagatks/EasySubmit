/**
 * Cross-domain summary builder — career-bridge pattern (Rezi / ResumeAdapter / Retuner).
 *
 * When experience overlap with the JD is low:
 * - Sentence 1: candidate identity + years + domain from experience (never JD title).
 * - Sentence 2: resume-native skills only (JD keywords live in Skills section).
 * - Sentence 3: transferable bridge phrases anchored in experience bullets.
 * - Sentence 4: strongest quantified bullet from experience.
 *
 * Competitors (Teal, Jobscan) mirror JD language in summary for aligned roles;
 * for career pivots they bridge past → future without inventing the target title.
 */

import { countSummaryWords, validateSummary } from "@/lib/resume/summary-rules";
import { isBannedSkill } from "@/lib/resume/skills-rules";
import type { DeterministicSummaryInput } from "@/lib/job-tracker/enhance/build-deterministic-summary";
import { pickStrongestExperienceBulletForSummary } from "@/lib/job-tracker/enhance/summary-bullet-pick";

type ExperienceEntry = DeterministicSummaryInput["experience"][number];

function deriveYearsOfExperience(
  experience: Array<{ startYear?: string }>,
): number | undefined {
  const years = experience
    .map((e) => parseInt(e.startYear ?? "", 10))
    .filter((y) => !isNaN(y) && y >= 1970 && y <= new Date().getFullYear());

  if (years.length === 0) return undefined;
  const earliest = Math.min(...years);
  return Math.min(new Date().getFullYear() - earliest, 20);
}

const TRANSFERABLE_BRIDGE_THEMES: Array<{
  label: string;
  patterns: RegExp[];
}> = [
  {
    label: "vendor and partner integrations",
    patterns: [
      /\b(uber eats|door\s*dash|third[- ]party|vendor|partner integration)\b/i,
    ],
  },
  {
    label: "cross-functional program delivery",
    patterns: [
      /\b(cross[- ]functional|product,\s*design|partnership with leaders|stakeholder)\b/i,
    ],
  },
  {
    label: "platform scale and reliability",
    patterns: [/\b(platform|7now|scalab|high[- ]volume|production)\b/i],
  },
  {
    label: "commercial and payment systems",
    patterns: [/\b(payment gateway|checkout|cart|cvs pay|patent)\b/i],
  },
  {
    label: "mobile and API product delivery",
    patterns: [/\b(mobile|api|ios|android|flutter|swift|kotlin)\b/i],
  },
  {
    label: "operational and process rigor",
    patterns: [/\b(roadmap|architecture standards|modular|clean architecture|mvvm)\b/i],
  },
];

function experienceBlob(experience: ExperienceEntry[]): string {
  return experience
    .map((e) => `${e.title ?? ""} ${e.company ?? ""} ${e.bullets ?? ""}`)
    .join(" ");
}

function inferLeadershipDomain(experience: ExperienceEntry[]): string {
  const blob = experienceBlob(experience).toLowerCase();
  const titleBlob = experience
    .map((e) => e.title ?? "")
    .join(" ")
    .toLowerCase();

  const hasMobile = /\b(mobile|ios|android|flutter|swift)\b/.test(blob);
  const hasPlatform = /\b(platform|api|7now|delivery)\b/.test(blob);
  const hasEngineeringLead =
    /\b(head of|director|engineering manager|vp)\b/.test(titleBlob) ||
    /\bengineering\b/.test(titleBlob);

  if (hasEngineeringLead && hasPlatform && hasMobile) {
    return "platform, mobile, and API engineering organizations";
  }
  if (hasEngineeringLead && hasPlatform) {
    return "platform and product engineering organizations";
  }
  if (hasEngineeringLead && hasMobile) {
    return "mobile and consumer product engineering teams";
  }
  if (hasEngineeringLead) {
    return "engineering and technology organizations";
  }
  if (/\b(product|program|project)\b/.test(titleBlob)) {
    return "product and program delivery organizations";
  }
  return "complex organizational environments";
}

export function extractTransferableBridgePhrases(experienceBlobText: string): string[] {
  const found: string[] = [];
  for (const theme of TRANSFERABLE_BRIDGE_THEMES) {
    if (theme.patterns.some((p) => p.test(experienceBlobText))) {
      found.push(theme.label);
    }
  }
  return found.slice(0, 3);
}

function pickStrongestBullet(experience: ExperienceEntry[]): string {
  return pickStrongestExperienceBulletForSummary(experience);
}

function formatSkillList(skills: string[], count: number): string {
  const slice = skills.slice(0, count);
  if (slice.length === 0) return "";
  if (slice.length === 1) return slice[0]!;
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`;
  return `${slice.slice(0, -1).join(", ")}, and ${slice[slice.length - 1]}`;
}

function tuneWordCount(result: string): string {
  let out = result;

  const expansions: Array<[string, string]> = [
    [
      "complex, fast-paced production environments.",
      "complex, fast-paced production environments with consistent quality standards.",
    ],
    [
      "global technology organizations.",
      "global technology organizations and multi-team engineering programs.",
    ],
  ];

  for (const [from, to] of expansions) {
    if (countSummaryWords(out) >= 70) break;
    if (out.includes(from)) out = out.replace(from, to);
  }

  if (countSummaryWords(out) > 80) {
    const parts = out.split(/(?<=[.!?])\s+/);
    if (parts.length >= 4) {
      parts[parts.length - 1] =
        "Delivered measurable engineering outcomes across platform, mobile, and API programs.";
      out = parts.join(" ");
    }
  }

  return out;
}

/** True when summary text includes JD-injected terms not present in resume-native skills. */
export function summaryLeaksJdSkillTerms(
  summary: string,
  resumeSkills: string[],
  jdSkills: string[],
): boolean {
  const lower = summary.toLowerCase();
  const nativeLower = new Set(resumeSkills.map((s) => s.toLowerCase()));
  for (const jd of jdSkills) {
    const key = jd.toLowerCase();
    if (nativeLower.has(key)) continue;
    if (key.length >= 4 && lower.includes(key)) return true;
  }
  return false;
}

export function buildCrossDomainSummary(input: DeterministicSummaryInput): string {
  const identity = input.summaryIdentity?.trim() || "Professional";
  const years = deriveYearsOfExperience(input.experience);
  const blob = experienceBlob(input.experience);
  const leadershipDomain = inferLeadershipDomain(input.experience);

  const resumeSkills = input.skills
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isBannedSkill(s));
  const topSkills = resumeSkills.slice(0, 3);
  const secondarySkills = resumeSkills.slice(3, 5);

  const s1 =
    years !== undefined
      ? `${identity} with ${years} years leading ${leadershipDomain} across global technology organizations.`
      : `${identity} with deep experience leading ${leadershipDomain} across global technology organizations.`;

  const skillPhrase = formatSkillList(topSkills, 3);
  const s2 = skillPhrase
    ? `Brings depth in ${skillPhrase} to deliver measurable outcomes in complex, fast-paced production environments.`
    : "Brings depth in technical leadership and program execution to deliver measurable outcomes in complex production environments.";

  const bridgePhrases = extractTransferableBridgePhrases(blob);
  const tailClause =
    "demonstrated program leadership, stakeholder alignment, and measurable execution.";
  let s3: string;
  if (bridgePhrases.length >= 2) {
    s3 = `Offers transferable strengths in ${bridgePhrases[0]} and ${bridgePhrases[1]}, with ${tailClause}`;
  } else if (bridgePhrases.length === 1) {
    const domainPair =
      secondarySkills.length >= 2
        ? `${secondarySkills[0]} and ${secondarySkills[1]}`
        : secondarySkills[0] ?? "multi-disciplinary initiatives";
    s3 = `Offers transferable strengths in ${bridgePhrases[0]}, with consistent depth across ${domainPair}.`;
  } else if (secondarySkills.length >= 2) {
    s3 = `Consistent contributor across ${secondarySkills[0]} and ${secondarySkills[1]}, with demonstrated program leadership and cross-functional delivery.`;
  } else {
    s3 =
      "Consistent contributor across multi-disciplinary initiatives, with demonstrated program leadership and cross-functional delivery.";
  }

  const bulletSentence = pickStrongestBullet(input.experience);
  const s4 =
    bulletSentence ||
    "Adept at translating complex requirements into business value within agile, collaborative environments.";

  return tuneWordCount([s1, s2, s3, s4].join(" "));
}

export function summaryOpensWithEmployer(summary: string, employerNames: string[]): boolean {
  const match = summary.trim().match(/^(.+?)\s+with\s+\d+/i);
  if (!match?.[1]) return false;
  const opening = match[1].trim().toLowerCase();
  return employerNames.some((name) => name.trim().toLowerCase() === opening);
}

export function shouldRebuildCrossDomainSummary(
  currentSummary: string,
  resumeSkills: string[],
  jdSkills: string[],
  employerNames: string[] = [],
): boolean {
  if (!currentSummary.trim()) return true;
  if (summaryOpensWithEmployer(currentSummary, employerNames)) return true;
  if (summaryLeaksJdSkillTerms(currentSummary, resumeSkills, jdSkills)) return true;

  const validation = validateSummary(currentSummary);
  if (validation.sentenceError || validation.wordError || validation.bannedWords.length > 0) {
    return true;
  }

  if (/\bsystems design\b/i.test(currentSummary)) return true;
  if (/\bprocurement\b|\bstrategic sourcing\b|\bpurchasing\b/i.test(currentSummary)) {
    return true;
  }

  return false;
}
