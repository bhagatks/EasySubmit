import { validateSummary, countSummaryWords } from "@/lib/resume/summary-rules";
import { isBannedSkill } from "@/lib/resume/skills-rules";
import { findEmbeddedExperienceHeaderInBullet } from "@/lib/resume/split-mashed-experience";
import { bulletHasStrongOpening } from "@/lib/resume/resume-bullet-verbs";

export type DeterministicSummaryInput = {
  currentSummary: string;
  skills: string[];
  experience: Array<{
    title?: string;
    company?: string;
    bullets: string;
    startYear?: string;
    endYear?: string;
  }>;
  targetRole: string;
  summaryTheme?: string;
  roleLevel?: string;
  domain?: string;
};

export function deriveYearsOfExperience(
  experience: Array<{ startYear?: string }>,
): number | undefined {
  const years = experience
    .map((e) => parseInt(e.startYear ?? "", 10))
    .filter((y) => !isNaN(y) && y >= 1970 && y <= new Date().getFullYear());

  if (years.length === 0) return undefined;
  const earliest = Math.min(...years);
  return Math.min(new Date().getFullYear() - earliest, 20);
}

function isSummarySafeBullet(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 12) return false;
  if (findEmbeddedExperienceHeaderInBullet(trimmed)) return false;
  if (!bulletHasStrongOpening(trimmed)) return false;
  if (
    /\b(led|built|designed|executed|deployed)\s+(led|lead|build|define|provide|partner|oversee|execute|design|deploy|serve|play|worked|provided)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  if (/[a-z]{4,}[A-Z][a-z]/.test(trimmed)) return false;
  return true;
}

function pickStrongestBullet(
  experience: Array<{ bullets: string }>,
): string {
  for (const entry of experience) {
    const bullets = (entry.bullets ?? "")
      .split("\n")
      .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
      .filter(Boolean);

    if (bullets.length === 0) continue;

    const metricBullet = bullets.find((b) => isSummarySafeBullet(b) && /\d/.test(b));
    const chosen = metricBullet ?? bullets.find((b) => isSummarySafeBullet(b));
    if (!chosen) continue;

    const match = chosen.match(/^[^.!?]+[.!?]/);
    const firstSentence = match ? match[0] : chosen;
    return firstSentence.endsWith(".") ? firstSentence : firstSentence + ".";
  }
  return "";
}

const BANNED_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bproven track record\b/gi, "consistent record"],
  [/\bleverages?\b/gi, "applies"],
  [/\bleveraged\b/gi, "applied"],
  [/\bpassionate\b/gi, "focused"],
  [/\bdynamic\b/gi, "adaptable"],
  [/\brobust\b/gi, "reliable"],
  [/\binnovative\b/gi, "effective"],
  [/\bsynergy\b/gi, "collaboration"],
  [/\butilizes?\b/gi, "uses"],
  [/\bfacilitates?\b/gi, "enables"],
  [/\bdelves?\b/gi, "examines"],
  [/\bresults.driven\b/gi, "results-oriented"],
  [/\bthought leader\b/gi, "domain expert"],
  [/\bdetail.oriented\b/gi, "thorough"],
  [/\bself.starter\b/gi, "independent contributor"],
  [/\bextensive experience\b/gi, "deep experience"],
  [/\bseasoned professional\b/gi, "experienced professional"],
  [/\bhighly motivated\b/gi, "driven"],
  [/\bteam player\b/gi, "collaborative professional"],
  [/\bvisionary\b/gi, "forward-thinking"],
  [/\bcomprehensive\b/gi, "thorough"],
  [/\bmission.critical\b/gi, "high-priority"],
  [/\bdiverse range of\b/gi, "a range of"],
];

function sanitizeBanned(text: string): string {
  let out = text;
  for (const [pattern, replacement] of BANNED_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function buildDeterministicSummary(input: DeterministicSummaryInput): string {
  const { sentenceError, wordError, bannedWords } = validateSummary(input.currentSummary);
  if (!sentenceError && !wordError && bannedWords.length === 0) {
    return input.currentSummary;
  }

  const years = deriveYearsOfExperience(input.experience);
  const topSkills = input.skills
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isBannedSkill(s));

  const s1skills = topSkills.slice(0, 3);
  const s2skills = topSkills.slice(3, 5);
  const theme = input.summaryTheme?.trim() || "deliver measurable business outcomes";
  const domain = input.domain?.trim();
  const targetRole = input.targetRole?.trim() || "Professional";

  // Sentence 1 — Identity
  let s1: string;
  if (years !== undefined && domain) {
    s1 = `${targetRole} with ${years} years of experience designing and delivering solutions in ${domain}, consistently building for scale and reliability.`;
  } else if (years !== undefined) {
    s1 = `${targetRole} with ${years} years of experience delivering impactful solutions across complex technical and business environments.`;
  } else if (domain) {
    s1 = `${targetRole} with deep expertise in ${domain}, focused on delivering production-grade solutions at scale.`;
  } else {
    s1 = `${targetRole} with deep expertise delivering high-impact solutions across complex technical and cross-functional environments.`;
  }

  // Sentence 2 — Method
  let s2: string;
  if (s1skills.length >= 3) {
    s2 = `Applies ${s1skills[0]}, ${s1skills[1]}, and ${s1skills[2]} to ${theme}, driving consistent outcomes in fast-paced production environments.`;
  } else if (s1skills.length === 2) {
    s2 = `Applies ${s1skills[0]} and ${s1skills[1]} to ${theme}, driving consistent outcomes in fast-paced production environments.`;
  } else if (s1skills.length === 1) {
    s2 = `Applies ${s1skills[0]} and complementary technologies to ${theme}, driving consistent outcomes in fast-paced production environments.`;
  } else {
    s2 = `Applies structured engineering practices and analytical rigor to ${theme}, driving consistent outcomes in fast-paced production environments.`;
  }

  // Sentence 3 — Specialization
  let s3: string;
  if (s2skills.length >= 2) {
    s3 = `Consistent contributor across ${s2skills[0]} and ${s2skills[1]} domains, with demonstrated depth in systems design and cross-functional delivery.`;
  } else if (s2skills.length === 1) {
    s3 = `Consistent contributor across ${s2skills[0]} and adjacent domains, with demonstrated depth in systems design and cross-functional delivery.`;
  } else if (s1skills.length >= 2) {
    s3 = `Consistent contributor across ${s1skills[0]} and ${s1skills[1]} ecosystems, with demonstrated depth in systems design and cross-functional delivery.`;
  } else {
    s3 = `Consistent contributor across multi-disciplinary initiatives, with demonstrated depth in systems design, delivery, and cross-functional collaboration.`;
  }

  // Sentence 4 — Impact from experience bullet
  const bulletSentence = pickStrongestBullet(input.experience);
  const s4 = bulletSentence || "Adept at translating technical requirements into business value within agile, collaborative environments.";

  let result = [s1, s2, s3, s4].join(" ");
  result = sanitizeBanned(result);

  // Word count correction — expand until ≥ 70, then trim if > 80
  let wc = countSummaryWords(result);

  if (wc < 70) {
    result = result.replace(
      /production environments\./,
      "production environments, consistently meeting delivery timelines and quality standards.",
    );
    wc = countSummaryWords(result);
  }

  if (wc < 70) {
    result = result.replace(
      "cross-functional delivery.",
      "cross-functional delivery, technical strategy, and measurable execution.",
    );
    wc = countSummaryWords(result);
  }

  if (wc > 80) {
    // Trim last sentence to at most 10 words
    const parts = result.split(/(?<=\.)\s+/);
    if (parts.length >= 4) {
      const last = parts[parts.length - 1];
      const words = last.split(/\s+/);
      if (words.length > 10) {
        parts[parts.length - 1] = words.slice(0, 10).join(" ").replace(/[,;]$/, "") + ".";
      }
      result = parts.join(" ");
    }
  }

  return result;
}
