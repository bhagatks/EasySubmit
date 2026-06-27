import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import {
  findBannedWords,
  stripBannedSummaryWords,
  validateSummary,
} from "@/lib/resume/summary-rules";
import {
  isBannedSkill,
  isProseSkill,
  joinSkillsText,
  parseSkillsText,
  validateSkillsSystem,
} from "@/lib/resume/skills-rules";
import { stripContactFromForm, type ResumeBodyForm } from "@/src/lib/ai/engine/candidate-context";
import { sanitizeEnhancedTextFields } from "@/src/lib/ai/engine/format-rules";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** AI often returns bullets as string[] — HubRefineryForm stores newline-joined string. */
export function coalesceBulletsField(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .filter((line): line is string => typeof line === "string")
      .join("\n");
  }
  return "";
}

function normalizeExperienceEntry(
  raw: unknown,
  index: number,
  fallback?: HubRefineryForm["experience"][number],
): HubRefineryForm["experience"][number] {
  const row = asRecord(raw);
  if (!row) {
    return (
      fallback ?? {
        id: `exp-${index}`,
        title: "",
        company: "",
        location: "",
        startMonth: "",
        startYear: "",
        endMonth: "",
        endYear: "",
        bullets: "",
        hidden: false,
      }
    );
  }

  return {
    id: readString(row.id) || fallback?.id || `exp-${index}`,
    title: readString(row.title) || fallback?.title || "",
    company: readString(row.company) || fallback?.company || "",
    location: readString(row.location) || fallback?.location || "",
    startMonth: readString(row.startMonth) || fallback?.startMonth || "",
    startYear: readString(row.startYear) || fallback?.startYear || "",
    endMonth: readString(row.endMonth) || fallback?.endMonth || "",
    endYear: readString(row.endYear) || fallback?.endYear || "",
    bullets: coalesceBulletsField(row.bullets ?? row.description) || fallback?.bullets || "",
    hidden: typeof row.hidden === "boolean" ? row.hidden : fallback?.hidden,
  };
}

function normalizeExperienceList(
  raw: unknown,
  base: HubRefineryForm["experience"],
): HubRefineryForm["experience"] {
  if (!Array.isArray(raw)) return base;

  const baseById = new Map(base.map((entry) => [entry.id, entry]));

  return raw.map((entry, index) => {
    const row = asRecord(entry);
    const fallback =
      (row?.id && typeof row.id === "string" ? baseById.get(row.id) : undefined) ??
      base[index];
    return normalizeExperienceEntry(entry, index, fallback);
  });
}

const SECTION_FIELD_MAP: Record<StudioEditorSectionId, (form: HubRefineryForm) => unknown> = {
  profileRole: () => null,
  header: (form) => ({
    firstName: form.firstName,
    lastName: form.lastName,
    cityState: form.cityState,
    phone: form.phone,
    email: form.email,
    linkedIn: form.linkedIn,
  }),
  professionalSummary: (form) => form.professionalSummary,
  skills: (form) => form.skillsText,
  professionalExperience: (form) => form.experience,
  education: (form) => form.education,
  certifications: (form) => form.certifications,
  projects: (form) => form.projects,
  languages: (form) => form.languages,
};

export function diffChangedSections(
  before: HubRefineryForm,
  after: HubRefineryForm,
  targetRoleChanged: boolean,
): StudioEditorSectionId[] {
  const changed: StudioEditorSectionId[] = [];

  if (targetRoleChanged) {
    changed.push("profileRole");
  }

  const sectionIds = Object.keys(SECTION_FIELD_MAP) as StudioEditorSectionId[];
  for (const sectionId of sectionIds) {
    if (sectionId === "profileRole" || sectionId === "header") continue;
    const pick = SECTION_FIELD_MAP[sectionId];
    if (stableStringify(pick(before)) !== stableStringify(pick(after))) {
      changed.push(sectionId);
    }
  }

  return changed;
}

export function buildSectionExpansionState(
  changedSections: StudioEditorSectionId[],
  allSectionIds: StudioEditorSectionId[],
): Record<string, boolean> {
  const changedSet = new Set(changedSections);
  return Object.fromEntries(
    allSectionIds.map((id) => [id, changedSet.has(id)]),
  );
}

export function parseEnhancedResumeBody(text: string): Partial<ResumeBodyForm> | null {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return sanitizeEnhancedTextFields(parsed as Partial<ResumeBodyForm>);
    }
  } catch {
    /* fall through */
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return sanitizeEnhancedTextFields(parsed as Partial<ResumeBodyForm>);
    }
  } catch {
    return null;
  }

  return null;
}

export function postProcessProfessionalSummary(
  summary: string,
  traceId = "no-trace",
  userId = "unknown",
): string {
  const trimmed = summary.trim();
  if (!trimmed) return summary;

  const validation = validateSummary(trimmed);
  const hasIssues =
    validation.sentenceError !== null ||
    validation.wordError !== null ||
    validation.bannedWords.length > 0;

  if (hasIssues) {
    logEnhance("engine", "post.summary_rules", {
      traceId,
      userId,
      step: ENHANCE_PIPELINE.ENGINE_MERGE,
      sentenceCount: validation.sentenceCount,
      wordCount: validation.wordCount,
      sentenceError: validation.sentenceError,
      wordError: validation.wordError,
      bannedWords: validation.bannedWords,
      action: validation.bannedWords.length > 0 ? "strip_banned" : "flag_only",
    });
  }

  if (findBannedWords(trimmed).length === 0) {
    return summary;
  }

  return stripBannedSummaryWords(trimmed);
}

export function postProcessSkillsText(
  skillsText: string,
  traceId = "no-trace",
  userId = "unknown",
): string {
  const parsed = parseSkillsText(skillsText);
  if (parsed.length === 0) return skillsText;

  const filtered: string[] = [];
  const removedBanned: string[] = [];
  const removedProse: string[] = [];

  for (const skill of parsed) {
    if (isBannedSkill(skill)) {
      removedBanned.push(skill);
      continue;
    }
    if (isProseSkill(skill)) {
      removedProse.push(skill);
      continue;
    }
    filtered.push(skill);
  }

  const trimmed = filtered.slice(0, 20);
  const validation = validateSkillsSystem(trimmed);

  if (removedBanned.length > 0 || removedProse.length > 0 || validation.countWarning || validation.compositionWarning) {
    logEnhance("engine", "post.skills_rules", {
      traceId,
      userId,
      step: ENHANCE_PIPELINE.ENGINE_MERGE,
      removedBanned,
      removedBannedCount: removedBanned.length,
      removedProse,
      removedProseCount: removedProse.length,
      skillsAfter: trimmed.length,
      countWarning: validation.countWarning,
      compositionWarning: validation.compositionWarning,
    });
  }

  return joinSkillsText(trimmed);
}

export function normalizeEnhancedBody(
  raw: Partial<ResumeBodyForm>,
  original: HubRefineryForm,
  traceId = "no-trace",
  userId = "unknown",
): ResumeBodyForm {
  const base = stripContactFromForm(original);

  return {
    professionalSummary:
      typeof raw.professionalSummary === "string"
        ? postProcessProfessionalSummary(raw.professionalSummary, traceId, userId)
        : base.professionalSummary,
    skillsText:
      typeof raw.skillsText === "string"
        ? postProcessSkillsText(raw.skillsText, traceId, userId)
        : base.skillsText,
    experience: normalizeExperienceList(raw.experience, base.experience),
    education: Array.isArray(raw.education) ? raw.education : base.education,
    certifications: Array.isArray(raw.certifications)
      ? raw.certifications
      : base.certifications,
    projects: Array.isArray(raw.projects) ? raw.projects : base.projects,
    languages: Array.isArray(raw.languages) ? raw.languages : base.languages,
    customSections: Array.isArray(raw.customSections)
      ? raw.customSections
      : base.customSections,
  };
}
