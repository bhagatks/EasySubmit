import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { validateExperienceBulletsV2 } from "@/lib/resume/v2/bullet-rules";
import {
  DEFAULT_RESUME_PAGE_MODE_V2,
  isResumePageModeV2Implemented,
  normalizeResumePageModeV2,
  type ResumePageModeV2,
} from "@/lib/resume/v2/page-mode";
import {
  EXTENDED_MODE_ATS_WARNING,
  EXTENDED_MODE_ATS_WARNING_CODE,
  resolveResumeRulesProfileV2,
  type ResumeRulesProfileV2,
} from "@/lib/resume/v2/rules-config";
import { validateSkillsV2 } from "@/lib/resume/v2/skills-rules";
import { validateSummaryV2 } from "@/lib/resume/v2/summary-rules";

export type ResumeValidationIssueV2 = {
  code: string;
  severity: "warning" | "error";
  message: string;
  section: "summary" | "skills" | "experience" | "layout" | "system";
};

export type ResumeValidationResultV2 = {
  version: 2;
  pageMode: ResumePageModeV2;
  profile: ResumeRulesProfileV2 | null;
  implemented: boolean;
  warnings: ResumeValidationIssueV2[];
  errors: ResumeValidationIssueV2[];
};

function issue(
  section: ResumeValidationIssueV2["section"],
  severity: ResumeValidationIssueV2["severity"],
  code: string,
  message: string,
): ResumeValidationIssueV2 {
  return { section, severity, code, message };
}

function detectTableViolations(form: HubRefineryForm): ResumeValidationIssueV2[] {
  const found: ResumeValidationIssueV2[] = [];
  const tablePattern = /\|.+\|/;

  if (tablePattern.test(form.skillsText ?? "")) {
    found.push(
      issue("layout", "error", "skills_table", "Skills section must not use tables (RULES v2)."),
    );
  }

  for (const section of form.customSections ?? []) {
    if (section.hidden) continue;
    if (tablePattern.test(section.content ?? "") || tablePattern.test(section.title ?? "")) {
      found.push(
        issue(
          "layout",
          "error",
          "custom_section_table",
          `Custom section "${section.title}" uses a table — not allowed in RULES v2.`,
        ),
      );
    }
  }

  return found;
}

export function validateResumeV2(
  form: HubRefineryForm,
  pageModeInput?: unknown,
): ResumeValidationResultV2 {
  const pageMode = normalizeResumePageModeV2(pageModeInput ?? form.pageLengthPreference ?? DEFAULT_RESUME_PAGE_MODE_V2);
  const profile = resolveResumeRulesProfileV2(pageMode);
  const implemented = isResumePageModeV2Implemented(pageMode);

  const warnings: ResumeValidationIssueV2[] = [];
  const errors: ResumeValidationIssueV2[] = [];

  if (!profile) {
    warnings.push(
      issue(
        "system",
        "warning",
        "page_mode_not_implemented",
        `Resume rules v2 for page mode "${pageMode}" are not implemented yet.`,
      ),
    );
    return { version: 2, pageMode, profile: null, implemented, warnings, errors };
  }

  const validationOptions = {
    modeLabel: profile.modeLabel,
    unlimitedContent: profile.unlimitedContent === true,
  };

  if (profile.unlimitedContent) {
    warnings.push(
      issue(
        "system",
        "warning",
        EXTENDED_MODE_ATS_WARNING_CODE,
        EXTENDED_MODE_ATS_WARNING,
      ),
    );
  }

  const summary = validateSummaryV2(form.professionalSummary ?? "", profile.summary, validationOptions);
  for (const message of summary.warnings) {
    warnings.push(issue("summary", "warning", "summary_rule", message));
  }
  for (const message of summary.errors) {
    errors.push(issue("summary", "error", "summary_rule", message));
  }

  const skills = validateSkillsV2(form.skillsText ?? "", profile.skills, validationOptions);
  for (const message of skills.warnings) {
    warnings.push(issue("skills", "warning", "skills_rule", message));
  }
  for (const message of skills.errors) {
    errors.push(issue("skills", "error", "skills_rule", message));
  }

  const bullets = validateExperienceBulletsV2(form.experience ?? [], profile.bullets, validationOptions);
  for (const message of bullets.warnings) {
    warnings.push(issue("experience", "warning", "bullet_rule", message));
  }
  for (const message of bullets.errors) {
    errors.push(issue("experience", "error", "bullet_rule", message));
  }

  if (profile.layout.forbidTables) {
    errors.push(...detectTableViolations(form));
  }

  return { version: 2, pageMode, profile, implemented, warnings, errors };
}

export function collectResumeValidationMessagesV2(result: ResumeValidationResultV2): {
  warnings: string[];
  errors: string[];
} {
  return {
    warnings: result.warnings.map((entry) => entry.message),
    errors: result.errors.map((entry) => entry.message),
  };
}
