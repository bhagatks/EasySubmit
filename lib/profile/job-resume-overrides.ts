import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { PageLengthPreference } from "@/lib/resume/page-length-preference";
import { normalizePageLengthPreference } from "@/lib/resume/page-length-preference";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import { diffChangedSections } from "@/src/lib/ai/engine/post-process";

export type JobResumeHeaderOverrides = Pick<
  HubRefineryForm,
  "firstName" | "lastName" | "cityState" | "phone" | "email" | "linkedIn"
>;

/** Section-level deltas merged on top of a base resume profile at read time. */
export type JobResumeOverrides = {
  targetTitle?: string;
  header?: JobResumeHeaderOverrides;
  professionalSummary?: string;
  skillsText?: string;
  experience?: HubRefineryForm["experience"];
  education?: HubRefineryForm["education"];
  certifications?: HubRefineryForm["certifications"];
  projects?: HubRefineryForm["projects"];
  languages?: HubRefineryForm["languages"];
  customSections?: HubRefineryForm["customSections"];
  pageLengthPreference?: PageLengthPreference;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseJobResumeOverrides(value: unknown): JobResumeOverrides {
  if (!isRecord(value)) return {};
  return value as JobResumeOverrides;
}

export function extractJobResumeOverrides(
  before: HubRefineryForm,
  after: HubRefineryForm,
  targetTitleBefore: string,
  targetTitleAfter: string,
): { overrides: JobResumeOverrides; changedSections: StudioEditorSectionId[] } {
  const targetRoleChanged = targetTitleBefore.trim() !== targetTitleAfter.trim();
  const changedSections = diffChangedSections(before, after, targetRoleChanged);
  const overrides: JobResumeOverrides = {};

  if (targetRoleChanged && targetTitleAfter.trim()) {
    overrides.targetTitle = targetTitleAfter.trim();
  }

  const headerBefore: JobResumeHeaderOverrides = {
    firstName: before.firstName,
    lastName: before.lastName,
    cityState: before.cityState,
    phone: before.phone,
    email: before.email,
    linkedIn: before.linkedIn,
  };
  const headerAfter: JobResumeHeaderOverrides = {
    firstName: after.firstName,
    lastName: after.lastName,
    cityState: after.cityState,
    phone: after.phone,
    email: after.email,
    linkedIn: after.linkedIn,
  };
  if (JSON.stringify(headerBefore) !== JSON.stringify(headerAfter)) {
    overrides.header = headerAfter;
    if (!changedSections.includes("header")) {
      changedSections.push("header");
    }
  }

  for (const sectionId of changedSections) {
    switch (sectionId) {
      case "profileRole":
        break;
      case "header":
        if (!overrides.header) {
          overrides.header = headerAfter;
        }
        break;
      case "professionalSummary":
        overrides.professionalSummary = after.professionalSummary;
        break;
      case "skills":
        overrides.skillsText = after.skillsText;
        break;
      case "professionalExperience":
        overrides.experience = after.experience;
        break;
      case "education":
        overrides.education = after.education;
        break;
      case "certifications":
        overrides.certifications = after.certifications;
        break;
      case "projects":
        overrides.projects = after.projects;
        break;
      case "languages":
        overrides.languages = after.languages;
        break;
    }
  }

  if (after.customSections.length > 0 || before.customSections.length > 0) {
    const beforeCustom = JSON.stringify(before.customSections);
    const afterCustom = JSON.stringify(after.customSections);
    if (beforeCustom !== afterCustom) {
      overrides.customSections = after.customSections;
    }
  }

  if (
    normalizePageLengthPreference(before.pageLengthPreference) !==
    normalizePageLengthPreference(after.pageLengthPreference)
  ) {
    overrides.pageLengthPreference = normalizePageLengthPreference(after.pageLengthPreference);
  }

  return { overrides, changedSections };
}

export function mergeProfileWithOverrides(
  baseForm: HubRefineryForm,
  baseTargetTitle: string,
  overrides: JobResumeOverrides,
): { form: HubRefineryForm; targetTitle: string } {
  const targetTitle = overrides.targetTitle?.trim() || baseTargetTitle;

  return {
    targetTitle,
    form: {
      ...baseForm,
      ...(overrides.header ?? {}),
      ...(overrides.professionalSummary !== undefined
        ? { professionalSummary: overrides.professionalSummary }
        : {}),
      ...(overrides.skillsText !== undefined ? { skillsText: overrides.skillsText } : {}),
      ...(overrides.experience !== undefined ? { experience: overrides.experience } : {}),
      ...(overrides.education !== undefined ? { education: overrides.education } : {}),
      ...(overrides.certifications !== undefined
        ? { certifications: overrides.certifications }
        : {}),
      ...(overrides.projects !== undefined ? { projects: overrides.projects } : {}),
      ...(overrides.languages !== undefined ? { languages: overrides.languages } : {}),
      ...(overrides.customSections !== undefined
        ? { customSections: overrides.customSections }
        : {}),
      ...(overrides.pageLengthPreference !== undefined
        ? { pageLengthPreference: overrides.pageLengthPreference }
        : {}),
    },
  };
}
