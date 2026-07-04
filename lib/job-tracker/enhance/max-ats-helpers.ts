export const MIN_JD_CHARS = 120;

export function hasFullJd(jobDescription?: string): boolean {
  return (jobDescription?.trim().length ?? 0) >= MIN_JD_CHARS;
}

export function hasRoleCompanyContext(targetRole: string, companyName?: string | null): boolean {
  return targetRole.trim().length > 0 && Boolean(companyName?.trim());
}

export function resolveDeterministicFallbackWarning(): string {
  return "AI optimization unavailable — deterministic resume applied.";
}

export function resolveEnhanceContextRequirement(input: {
  jobDescription?: string | null;
  targetRole: string;
  companyName?: string | null;
}): { ok: true; jobDescription: string } | { ok: false; error: string } {
  const jobDescription = input.jobDescription?.trim() ?? "";
  if (hasFullJd(jobDescription)) {
    return { ok: true, jobDescription };
  }
  if (hasRoleCompanyContext(input.targetRole, input.companyName)) {
    return { ok: true, jobDescription };
  }
  return {
    ok: false,
    error:
      "Add a job description (120+ characters) or ensure job title and company are saved.",
  };
}
