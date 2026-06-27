import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { parseSkillsText } from "@/lib/resume/skills-rules";
import type { ResumeValidationResult } from "@/lib/resume/validation/types";
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
  ValidationIssue,
  ValidationSeverity,
} from "@/lib/resume/validation/types";

export function validateResume(
  form: HubRefineryForm,
  targetRole: string,
): ResumeValidationResult {
  const header = validateHeader(form);
  const targetRoleResult = validateTargetRole(targetRole);
  const summary = validateSummarySection(form);
  const skills = validateSkillsSection(parseSkillsText(form.skillsText ?? ""));
  const experience = validateExperienceSection(form);
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
