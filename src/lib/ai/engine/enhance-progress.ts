import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { clampEnhanceTimeoutMs } from "@/src/lib/services/enhance-with-ai-config";

export type EnhanceWorkloadTier = "light" | "medium" | "heavy";

export type EnhanceProgressEstimate = {
  tier: EnhanceWorkloadTier;
  estimatedMs: number;
  estimatedLabel: string;
  passCount: 1 | 2;
  totalInputChars: number;
  formChars: number;
  jobDescriptionChars: number;
  rawResumeSnippetChars: number;
};

export type EnhanceProgressMessage = {
  headline: string;
  detail?: string;
  phase: string;
};

const BASE_MS_PER_PASS = 12_000;
const CHAR_SCALE_DIVISOR = 8_000;
const MAX_CHAR_FACTOR = 2.5;
const RAW_SNIPPET_RATIO = 0.35;

function countFormChars(form: HubRefineryForm): number {
  let total = 0;
  const add = (value: string | undefined | null) => {
    total += value?.length ?? 0;
  };

  add(form.professionalSummary);
  add(form.skillsText);
  add(form.firstName);
  add(form.lastName);
  add(form.cityState);

  for (const entry of form.experience) {
    if (entry.hidden) continue;
    add(entry.title);
    add(entry.company);
    add(entry.location);
    add(entry.bullets);
  }

  for (const entry of form.education) {
    if (entry.hidden) continue;
    add(entry.degree);
    add(entry.school);
    add(entry.location);
  }

  for (const entry of form.certifications) {
    if (entry.hidden) continue;
    add(entry.text);
  }

  for (const entry of form.projects) {
    if (entry.hidden) continue;
    add(entry.text);
  }

  for (const entry of form.languages) {
    if (entry.hidden) continue;
    add(entry.text);
  }

  for (const section of form.customSections) {
    if (section.hidden) continue;
    add(section.title);
    add(section.content);
  }

  return total;
}

function formatDurationLabel(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 45) {
    return `~${seconds} seconds`;
  }
  const minutesLow = Math.floor(seconds / 60);
  const minutesHigh = Math.ceil(seconds / 60);
  if (minutesLow === minutesHigh) {
    return `~${minutesLow} minute${minutesLow === 1 ? "" : "s"}`;
  }
  return `~${minutesLow}–${minutesHigh} minutes`;
}

function resolveTier(estimatedMs: number): EnhanceWorkloadTier {
  if (estimatedMs < 22_000) return "light";
  if (estimatedMs < 50_000) return "medium";
  return "heavy";
}

/** Estimate enhance duration from resume + optional JD size (mirrors two-pass engine). */
export function measureEnhanceWorkload(input: {
  form: HubRefineryForm;
  jobDescription?: string;
  rawResumeText?: string | null;
}): EnhanceProgressEstimate {
  const formChars = countFormChars(input.form);
  const jobDescriptionChars = input.jobDescription?.trim().length ?? 0;
  const rawResumeSnippetChars = Math.round(
    (input.rawResumeText?.trim().length ?? 0) * RAW_SNIPPET_RATIO,
  );
  const totalInputChars = formChars + jobDescriptionChars + rawResumeSnippetChars;
  const passCount: 1 | 2 = jobDescriptionChars > 0 ? 2 : 1;

  const charFactor = Math.min(
    MAX_CHAR_FACTOR,
    1 + totalInputChars / CHAR_SCALE_DIVISOR,
  );
  const estimatedMs = Math.round(BASE_MS_PER_PASS * passCount * charFactor);

  const tier = resolveTier(estimatedMs);

  return {
    tier,
    estimatedMs,
    estimatedLabel: formatDurationLabel(estimatedMs),
    passCount,
    totalInputChars,
    formChars,
    jobDescriptionChars,
    rawResumeSnippetChars,
  };
}

export function resolveEnhanceProgressMessage(input: {
  tier: EnhanceWorkloadTier;
  estimatedMs: number;
  elapsedMs: number;
  passCount: 1 | 2;
}): EnhanceProgressMessage {
  const { tier, estimatedMs, elapsedMs, passCount } = input;
  const ratio = estimatedMs > 0 ? elapsedMs / estimatedMs : 0;

  if (tier === "light") {
    if (elapsedMs < 12_000) {
      return {
        phase: "light_start",
        headline: "Enhancing your resume…",
      };
    }
    return {
      phase: "light_wait",
      headline: "Still enhancing your resume…",
      detail: "Almost done — applying AI edits to your sections.",
    };
  }

  if (ratio < 0.25) {
    return {
      phase: "pass_start",
      headline: "Enhancing your resume…",
      detail:
        passCount === 2
          ? `Reading your resume and job description — usually takes ${formatDurationLabel(estimatedMs)}.`
          : `Rewriting for ATS impact — usually takes ${formatDurationLabel(estimatedMs)}.`,
    };
  }

  if (ratio < 0.55) {
    return {
      phase: passCount === 2 ? "pass_one" : "generating",
      headline: passCount === 2 ? "Tailoring to the job posting…" : "Rewriting your resume…",
      detail: "AI is strengthening summaries, skills, and experience bullets.",
    };
  }

  if (ratio < 0.85) {
    return {
      phase: passCount === 2 ? "pass_two" : "polishing",
      headline:
        passCount === 2 ? "Optimizing for the role…" : "Polishing your resume sections…",
      detail: "Still working — larger resumes take a little longer.",
    };
  }

  if (ratio < 1.15) {
    return {
      phase: "finishing",
      headline: "Finishing up…",
      detail: "Merging AI output into your resume structure.",
    };
  }

  if (ratio < 1.75) {
    return {
      phase: "over_estimate",
      headline: "Still processing — thanks for waiting.",
      detail:
        "This is taking longer than usual, but we're still working. Large job descriptions and long resumes need extra time.",
    };
  }

  return {
    phase: "long_wait",
    headline: "Still working on your resume…",
    detail:
      "Hang tight — complex inputs can take a few minutes. You can keep this dialog open while we finish.",
  };
}

/** Progress ratio for a subtle bar (caps at 92% until the server responds). */
export function resolveEnhanceProgressRatio(elapsedMs: number, estimatedMs: number): number {
  if (estimatedMs <= 0) return 0;
  const raw = elapsedMs / estimatedMs;
  return Math.min(0.92, Math.max(0.08, raw * 0.85));
}

/** Client wait = max(app_config timeout, 135% of workload estimate). */
export function resolveEnhanceClientTimeoutMs(
  configTimeoutMs: number,
  estimate: EnhanceProgressEstimate,
): number {
  const workloadFloor = Math.ceil(estimate.estimatedMs * 1.35);
  return clampEnhanceTimeoutMs(Math.max(configTimeoutMs, workloadFloor));
}
