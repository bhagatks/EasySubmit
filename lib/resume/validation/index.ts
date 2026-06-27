import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { parseSkillsText } from "@/lib/resume/skills-rules";
import type {
  ResumeValidationResult,
  ValidateResumeOptions,
} from "@/lib/resume/validation/types";
import {
  validateEducationSection,
  validateExperienceSection,
  validateHeader,
  validateSkillsSection,
  validateSummarySection,
  validateTargetRole,
} from "@/lib/resume/validation/validators";

export type {
  ResumeValidationResult,
  SectionValidationResult,
  ValidateResumeOptions,
  ValidationIssue,
  ValidationSeverity,
} from "@/lib/resume/validation/types";

export function collectValidationErrorMessages(
  result: Pick<
    ResumeValidationResult,
    "header" | "targetRole" | "summary" | "skills" | "experience"
  >,
): string[] {
  return [
    ...result.targetRole.issues,
    ...result.header.issues,
    ...result.summary.issues,
    ...result.skills.issues,
    ...result.experience.issues,
  ]
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);
}

export function validateResume(
  form: HubRefineryForm,
  targetRole: string,
  options: ValidateResumeOptions = {},
): ResumeValidationResult {
  const header = validateHeader(form);
  const targetRoleResult = validateTargetRole(targetRole);
  const summary = validateSummarySection(form, {
    required: options.summaryRequired !== false,
  });
  const skills = validateSkillsSection(parseSkillsText(form.skillsText ?? ""));
  const experience = validateExperienceSection(form, targetRole);
  const education = validateEducationSection(form);

  return {
    header,
    targetRole: targetRoleResult,
    summary,
    skills,
    experience,
    education,
    canFinalize:
      !header.hasErrors &&
      !targetRoleResult.hasErrors &&
      !summary.hasErrors &&
      !skills.hasErrors &&
      !experience.hasErrors,
  };
}
