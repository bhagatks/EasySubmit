export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  field: string;
  code: string;
  severity: ValidationSeverity;
  message: string;
};

export type SectionValidationResult = {
  issues: ValidationIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
};

export type ResumeValidationResult = {
  header: SectionValidationResult;
  targetRole: SectionValidationResult;
  summary: SectionValidationResult;
  skills: SectionValidationResult;
  experience: SectionValidationResult;
  education: SectionValidationResult;
  canFinalize: boolean;
};
