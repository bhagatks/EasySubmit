/**
 * Deterministic cover letter builder — no AI.
 *
 * Used by:
 * - Extension / dashboard pipeline tailor (after resume enhance)
 * - Job detail backfill when cover is empty
 *
 * AI cover letters are only produced via `enhanceJobCoverLetter` (Review Screen button).
 */

import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { formatDateRangeParts } from "@/lib/resume/dates";
import { TECH_SKILLS } from "@/lib/resume/skills";
import { generateCoverLetter } from "@/lib/job-tracker/cover-letter-generator";
import {
  extractJobAndResumeContext,
  type FieldSource,
  type JobContext,
  type ParsedField,
  type ResumeContext,
  JOB_CONTEXT_FALLBACKS,
  RESUME_CONTEXT_FALLBACKS,
} from "@/lib/job-tracker/extract-job-resume-context";
import { buildTailorPlaceholders, firstVisibleExperienceEntry } from "@/lib/job-tracker/build-tailor-placeholders";
import { buildCoverLetterDocumentPatch } from "@/lib/job-tracker/persist-cover-letter";

export type TailorCoverLetterInput = {
  form: HubRefineryForm;
  targetTitle: string;
  company: string | null;
  jobTitle: string;
  jobDescription?: string | null;
  existingCoverLetter?: string | null;
};

function parsedField<T>(value: T): ParsedField<T> {
  return { value, source: "parsed" };
}

function fieldFromString(
  value: string | null | undefined,
  fallback: string,
): ParsedField<string> {
  const trimmed = value?.trim();
  if (trimmed) return parsedField(trimmed);
  return { value: fallback, source: "fallback" };
}

/** Serialize tailored resume form into Markdown the parser understands. */
export function hubRefineryFormToResumeMarkdown(
  form: HubRefineryForm,
  targetTitle: string,
): string {
  const lines: string[] = [];
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();

  if (name) lines.push(`# ${name}`);
  if (form.email?.trim()) lines.push(form.email.trim());
  if (form.cityState?.trim()) lines.push(form.cityState.trim());
  if (form.phone?.trim()) lines.push(form.phone.trim());

  if (form.professionalSummary?.trim()) {
    lines.push("", "## Professional Summary", form.professionalSummary.trim());
  }

  if (form.skillsText?.trim()) {
    lines.push("", "## Skills", form.skillsText.trim());
  }

  const visibleExperience = form.experience.filter(
    (e) => !e.hidden && (e.title?.trim() || e.company?.trim()),
  );
  if (visibleExperience.length > 0) {
    lines.push("", "## Experience");
    for (const entry of visibleExperience) {
      const title = entry.title?.trim() || "Role";
      const company = entry.company?.trim();
      const header = company ? `${title} at ${company}` : title;
      lines.push("", header);

      const date = formatDateRangeParts({
        start: { month: entry.startMonth?.trim() ?? "", year: entry.startYear?.trim() ?? "" },
        end: { month: entry.endMonth?.trim() ?? "", year: entry.endYear?.trim() ?? "" },
      });
      if (date) lines.push(date);

      if (entry.bullets?.trim()) {
        for (const bullet of entry.bullets.split("\n")) {
          const line = bullet.trim();
          if (line) lines.push(line.startsWith("-") ? line : `- ${line}`);
        }
      }
    }
  }

  if (targetTitle.trim()) {
    lines.push("", `Target role: ${targetTitle.trim()}`);
  }

  return lines.join("\n").trim();
}

/** Build JD text block from captured job fields. */
export function buildJobDescriptionText(input: {
  company: string | null;
  jobTitle: string;
  jobDescription?: string | null;
}): string {
  return [input.company, input.jobTitle, input.jobDescription]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");
}

function topSkillsFromForm(form: HubRefineryForm, limit = 3): string[] {
  const blob = [
    form.skillsText,
    ...form.experience
      .filter((e) => !e.hidden)
      .flatMap((e) => [e.title, e.company, e.bullets]),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const found: string[] = [];
  for (const skill of TECH_SKILLS) {
    const token = skill.toLowerCase();
    const pattern = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(blob)) {
      found.push(skill);
      if (found.length >= limit) break;
    }
  }
  return found;
}

function mostRecentTitleFromForm(form: HubRefineryForm, targetTitle: string): string {
  const entry = firstVisibleExperienceEntry(form);
  return entry?.title?.trim() || targetTitle.trim() || RESUME_CONTEXT_FALLBACKS.mostRecentJobTitle;
}

/**
 * Prefer structured tailor fields; use parser output to fill gaps only.
 */
export function mergeTailorInputWithParserContext(
  input: TailorCoverLetterInput,
  parsed: { resume: ResumeContext; job: JobContext },
): { resume: ResumeContext; job: JobContext } {
  const name = [input.form.firstName, input.form.lastName].filter(Boolean).join(" ").trim();
  const skills = topSkillsFromForm(input.form);
  const priorTitle = mostRecentTitleFromForm(input.form, input.targetTitle);

  const resume: ResumeContext = {
    candidateName: name
      ? parsedField(name)
      : parsed.resume.candidateName,
    email: input.form.email?.trim()
      ? parsedField(input.form.email.trim())
      : parsed.resume.email,
    location: input.form.cityState?.trim()
      ? parsedField(input.form.cityState.trim())
      : parsed.resume.location,
    topSkills:
      skills.length > 0
        ? parsedField(skills)
        : parsed.resume.topSkills,
    mostRecentJobTitle: parsedField(priorTitle),
  };

  const job: JobContext = {
    companyName: fieldFromString(
      input.company,
      parsed.job.companyName.source === "parsed"
        ? parsed.job.companyName.value
        : JOB_CONTEXT_FALLBACKS.companyName,
    ),
    targetJobTitle: fieldFromString(
      input.jobTitle || input.targetTitle,
      parsed.job.targetJobTitle.source === "parsed"
        ? parsed.job.targetJobTitle.value
        : JOB_CONTEXT_FALLBACKS.targetJobTitle,
    ),
    topKeywords: parsed.job.topKeywords,
  };

  if (job.companyName.source === "fallback" && parsed.job.companyName.source === "parsed") {
    job.companyName = parsed.job.companyName;
  }
  if (job.targetJobTitle.source === "fallback" && parsed.job.targetJobTitle.source === "parsed") {
    job.targetJobTitle = parsed.job.targetJobTitle;
  }

  return { resume, job };
}

export type DeterministicCoverLetterResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string };

/**
 * Build a cover letter body using parser + template matrix only (no AI).
 */
export function buildDeterministicCoverLetterMarkdown(
  input: Omit<TailorCoverLetterInput, "existingCoverLetter">,
): DeterministicCoverLetterResult {
  const resumeMarkdown = hubRefineryFormToResumeMarkdown(input.form, input.targetTitle);
  const jdText = buildJobDescriptionText(input);

  const parsed = extractJobAndResumeContext(resumeMarkdown, jdText);
  const merged = mergeTailorInputWithParserContext(input, parsed);

  const generated = generateCoverLetter({
    resumeData: merged.resume,
    jdData: merged.job,
    placeholders: buildTailorPlaceholders({
      form: input.form,
      resumeData: merged.resume,
      jdData: merged.job,
    }),
  });

  if (!generated.ok) {
    return { ok: false, error: generated.error };
  }

  return { ok: true, markdown: generated.markdown };
}

/**
 * Pipeline / tailor hook: seed `job_resume_tailors.coverLetter` when empty.
 * Returns null when user already has a saved letter.
 */
export function buildCoverLetterSeedPatch(
  input: TailorCoverLetterInput,
): { coverLetter: string; coverLetterLatex: string } | null {
  if (input.existingCoverLetter?.trim()) {
    return null;
  }

  const letter = buildDeterministicCoverLetterMarkdown(input);
  if (!letter.ok) {
    return null;
  }

  return buildCoverLetterDocumentPatch({
    form: input.form,
    company: input.company,
    jobTitle: input.jobTitle,
    body: letter.markdown,
  });
}

/** Exposed for tests — documents which fields came from structured vs parsed data. */
export function buildCoverLetterParserInput(input: TailorCoverLetterInput): {
  resume: ResumeContext;
  job: JobContext;
} {
  const resumeMarkdown = hubRefineryFormToResumeMarkdown(input.form, input.targetTitle);
  const jdText = buildJobDescriptionText(input);
  const parsed = extractJobAndResumeContext(resumeMarkdown, jdText);
  return mergeTailorInputWithParserContext(input, parsed);
}

export type { FieldSource };
