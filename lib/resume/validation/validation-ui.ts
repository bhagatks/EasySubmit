import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import type {
  ResumeValidationResult,
  SectionValidationResult,
  ValidationIssue,
} from "@/lib/resume/validation/types";

export function validationFieldToStudioSection(
  field: string,
): StudioEditorSectionId | "profileRole" | null {
  if (field === "targetRole") return "profileRole";
  if (
    field === "firstName" ||
    field === "lastName" ||
    field === "email" ||
    field === "phone" ||
    field === "cityState" ||
    field === "linkedIn"
  ) {
    return "header";
  }
  if (field === "professionalSummary") return "professionalSummary";
  if (field === "skills") return "skills";
  if (field === "experience" || field.startsWith("experience[")) {
    return "professionalExperience";
  }
  if (field.startsWith("education[")) return "education";
  return null;
}

export function issueIsBlockingError(issue: ValidationIssue): boolean {
  return issue.severity === "error";
}

export function sectionHasBlockingErrors(result: SectionValidationResult): boolean {
  return result.issues.some(issueIsBlockingError);
}

export function collectStudioSectionsWithErrors(
  result: ResumeValidationResult,
  options: { includeProfileRole?: boolean } = {},
): Array<StudioEditorSectionId | "profileRole"> {
  const sections = new Set<StudioEditorSectionId | "profileRole">();
  const issueGroups = [
    ...(options.includeProfileRole ? result.targetRole.issues : []),
    ...result.header.issues,
    ...result.summary.issues,
    ...result.skills.issues,
    ...result.experience.issues,
    ...result.education.issues,
  ];

  for (const issue of issueGroups) {
    if (!issueIsBlockingError(issue)) continue;
    const section = validationFieldToStudioSection(issue.field);
    if (section) sections.add(section);
  }

  return [...sections];
}

export function experienceRoleHasBlockingError(
  issues: ValidationIssue[],
  index: number,
): boolean {
  const prefix = `experience[${index}]`;
  return issues.some(
    (issue) => issueIsBlockingError(issue) && issue.field.startsWith(prefix),
  );
}
