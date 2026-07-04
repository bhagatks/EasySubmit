import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { MIN_STUDIO_SKILLS } from "@/lib/onboarding/studio";
import {
  validateHeader,
  validateTargetRole,
} from "@/lib/resume/validation/validators";

/** Profile studio saves persist drafts — header + role + skills gate only. */
export function profileStudioPersistErrors(
  form: HubRefineryForm,
  targetRole: string,
  skills: string[],
): string[] {
  const errors: string[] = [];

  if (!targetRole.trim()) {
    errors.push("Profile role name is required before saving.");
  }

  if (skills.length < MIN_STUDIO_SKILLS) {
    errors.push(`Add at least ${MIN_STUDIO_SKILLS} skills before saving.`);
  }

  for (const issue of validateTargetRole(targetRole).issues) {
    if (issue.severity === "error") errors.push(issue.message);
  }

  for (const issue of validateHeader(form).issues) {
    if (issue.severity === "error") errors.push(issue.message);
  }

  return errors;
}

export function canPersistProfileStudio(
  form: HubRefineryForm,
  targetRole: string,
  skills: string[],
): boolean {
  return profileStudioPersistErrors(form, targetRole, skills).length === 0;
}
