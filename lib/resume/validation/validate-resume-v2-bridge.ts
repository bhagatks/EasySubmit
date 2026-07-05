import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type {
  ResumeValidationResult,
  SectionValidationResult,
  ValidationIssue,
} from "@/lib/resume/validation/types";
import {
  validateResumeV2,
  type ResumeValidationIssueV2,
} from "@/lib/resume/v2/validate-resume";

function sectionFromV2(issues: ResumeValidationIssueV2[]): SectionValidationResult {
  const mapped: ValidationIssue[] = issues.map((issue) => ({
    field: issue.section,
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
  }));
  return {
    issues: mapped,
    hasErrors: mapped.some((issue) => issue.severity === "error"),
    hasWarnings: mapped.some((issue) => issue.severity === "warning"),
  };
}

function emptySection(): SectionValidationResult {
  return { issues: [], hasErrors: false, hasWarnings: false };
}

/** Maps RULES v2 validation into the studio v1 result shape (header/education unchanged). */
export function validateResumeWithRulesV2(
  form: HubRefineryForm,
  header: SectionValidationResult,
  targetRole: SectionValidationResult,
  education: SectionValidationResult,
): ResumeValidationResult {
  const v2 = validateResumeV2(form);
  const summaryIssues = v2.warnings
    .concat(v2.errors)
    .filter((issue) => issue.section === "summary");
  const skillsIssues = v2.warnings
    .concat(v2.errors)
    .filter((issue) => issue.section === "skills");
  const experienceIssues = v2.warnings
    .concat(v2.errors)
    .filter((issue) => issue.section === "experience");
  const layoutIssues = v2.warnings
    .concat(v2.errors)
    .filter((issue) => issue.section === "layout" || issue.section === "system");

  const summary = sectionFromV2(summaryIssues);
  const skills = sectionFromV2(skillsIssues);
  const experience = sectionFromV2(experienceIssues);
  const layout = sectionFromV2(layoutIssues);

  return {
    header,
    targetRole,
    summary,
    skills,
    experience: {
      issues: [...experience.issues, ...layout.issues],
      hasErrors: experience.hasErrors || layout.hasErrors,
      hasWarnings: experience.hasWarnings || layout.hasWarnings,
    },
    education,
    canFinalize:
      !header.hasErrors &&
      !targetRole.hasErrors &&
      !summary.hasErrors &&
      !skills.hasErrors &&
      !experience.hasErrors &&
      !layout.hasErrors,
  };
}

export function emptyHeaderSection(): SectionValidationResult {
  return emptySection();
}
