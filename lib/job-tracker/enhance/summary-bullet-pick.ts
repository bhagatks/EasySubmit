import { findEmbeddedExperienceHeaderInBullet } from "@/lib/resume/split-mashed-experience";
import {
  bulletHasQuantifiedMetric,
  bulletHasStrongOpening,
} from "@/lib/resume/resume-bullet-verbs";

type ExperienceEntry = {
  bullets?: string;
};

function isSummarySafeBullet(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 12) return false;
  if (findEmbeddedExperienceHeaderInBullet(trimmed)) return false;
  if (!bulletHasStrongOpening(trimmed)) return false;
  if (/[a-z]{4,}[A-Z][a-z]/.test(trimmed)) return false;
  return true;
}

function extractMetricClause(bullet: string): string | null {
  const match = bullet.match(
    /(?:increased|reduced|improved|boosted|grew|saved|delivered|cut|accelerated)[^.!?]{0,70}(?:\d+\s*[%xX]|\d+%|\$\d)[^.!?]*/i,
  );
  if (!match) return null;
  let clause = match[0].trim().replace(/^[,;]\s*/, "");
  if (!clause) return null;
  clause = clause.charAt(0).toUpperCase() + clause.slice(1);
  return clause.endsWith(".") ? clause : `${clause.replace(/[,;]$/, "")}.`;
}

function firstSentenceOfBullet(bullet: string, maxWords = 16): string {
  const sentenceMatch = bullet.match(/^[^.!?]+[.!?]/);
  if (sentenceMatch) {
    const sentence = sentenceMatch[0].trim();
    const words = sentence.split(/\s+/);
    if (words.length <= maxWords) {
      return sentence.endsWith(".") ? sentence : `${sentence}.`;
    }
  }

  const words = bullet.trim().split(/\s+/).slice(0, maxWords);
  const trimmed = words.join(" ").replace(/[,;]$/, "");
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

export function pickStrongestExperienceBulletForSummary(
  experience: ExperienceEntry[],
): string {
  for (const entry of experience) {
    const bullets = (entry.bullets ?? "")
      .split("\n")
      .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
      .filter(Boolean);

    const metricBullet = bullets.find(
      (b) => isSummarySafeBullet(b) && bulletHasQuantifiedMetric(b),
    );
    if (metricBullet) {
      const metricClause = extractMetricClause(metricBullet);
      if (metricClause) return metricClause;
      return firstSentenceOfBullet(metricBullet);
    }

    const chosen = bullets.find((b) => isSummarySafeBullet(b));
    if (chosen) return firstSentenceOfBullet(chosen);
  }

  return "";
}
