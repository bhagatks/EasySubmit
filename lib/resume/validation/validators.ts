import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { DEFAULT_DIAL_CODE } from "@/lib/phone/countryCodes";
import {
  isValidPhoneNumber,
  splitPhoneNumber,
} from "@/lib/phone/phone";
import { validateSummary } from "@/lib/resume/summary-rules";
import {
  isProseSkill,
  validateSkillsManual,
} from "@/lib/resume/skills-rules";
import type {
  SectionValidationResult,
  ValidationIssue,
} from "@/lib/resume/validation/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_PATTERN =
  /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?$/;
const JUNK_TEXT_PATTERN = /^[^a-zA-Z0-9]+$/;

function sectionResult(issues: ValidationIssue[]): SectionValidationResult {
  return {
    issues,
    hasErrors: issues.some((issue) => issue.severity === "error"),
    hasWarnings: issues.some((issue) => issue.severity === "warning"),
  };
}

export function validateHeader(form: HubRefineryForm): SectionValidationResult {
  const issues: ValidationIssue[] = [];
  const firstName = form.firstName?.trim() ?? "";

  if (firstName.length < 1) {
    issues.push({
      field: "firstName",
      code: "header_first_name_required",
      severity: "error",
      message: "First name is required.",
    });
  }

  const email = form.email?.trim() ?? "";
  if (!email || !EMAIL_PATTERN.test(email)) {
    issues.push({
      field: "email",
      code: "header_email_invalid",
      severity: "error",
      message: "A valid email address is required.",
    });
  }

  const phoneParts = splitPhoneNumber(form.phone ?? "");
  const dialCode = phoneParts.dialCode || DEFAULT_DIAL_CODE;
  if (!isValidPhoneNumber(dialCode, phoneParts.nationalNumber)) {
    issues.push({
      field: "phone",
      code: "header_phone_invalid",
      severity: "error",
      message: "A valid phone number is required.",
    });
  }

  if (!(form.lastName?.trim() ?? "")) {
    issues.push({
      field: "lastName",
      code: "header_last_name_empty",
      severity: "warning",
      message: "Last name is recommended.",
    });
  }

  if (!(form.cityState?.trim() ?? "")) {
    issues.push({
      field: "cityState",
      code: "header_city_state_empty",
      severity: "warning",
      message: "City and state are recommended.",
    });
  }

  const linkedIn = form.linkedIn?.trim() ?? "";
  if (linkedIn && !LINKEDIN_PATTERN.test(linkedIn)) {
    issues.push({
      field: "linkedIn",
      code: "header_linkedin_invalid",
      severity: "warning",
      message: "LinkedIn URL should look like https://linkedin.com/in/your-name",
    });
  }

  return sectionResult(issues);
}

export function validateTargetRole(targetRole: string): SectionValidationResult {
  const issues: ValidationIssue[] = [];
  const trimmed = targetRole.trim();

  if (!trimmed) {
    issues.push({
      field: "targetRole",
      code: "target_role_required",
      severity: "error",
      message: "Target role is required.",
    });
  } else if (trimmed.length < 3) {
    issues.push({
      field: "targetRole",
      code: "target_role_too_short",
      severity: "error",
      message: "Target role must be at least 3 characters.",
    });
  }

  if (trimmed.length > 100) {
    issues.push({
      field: "targetRole",
      code: "target_role_too_long",
      severity: "warning",
      message: "Target role is longer than 100 characters.",
    });
  }

  return sectionResult(issues);
}

export function validateSummarySection(form: HubRefineryForm): SectionValidationResult {
  const issues: ValidationIssue[] = [];
  const summary = form.professionalSummary?.trim() ?? "";

  if (!summary) {
    issues.push({
      field: "professionalSummary",
      code: "summary_empty",
      severity: "error",
      message: "Professional summary is required.",
    });
    return sectionResult(issues);
  }

  const validation = validateSummary(summary);

  if (validation.sentenceError) {
    issues.push({
      field: "professionalSummary",
      code: "summary_sentence_count",
      severity: "warning",
      message: validation.sentenceError,
    });
  }

  if (validation.wordError) {
    issues.push({
      field: "professionalSummary",
      code: "summary_word_count",
      severity: "warning",
      message: validation.wordError,
    });
  }

  if (validation.bannedWords.length > 0) {
    issues.push({
      field: "professionalSummary",
      code: "summary_banned_words",
      severity: "warning",
      message: `Overused phrases: ${validation.bannedWords.join(", ")}`,
    });
  }

  return sectionResult(issues);
}

export function validateSkillsSection(skills: string[]): SectionValidationResult {
  const issues: ValidationIssue[] = [];
  const validation = validateSkillsManual(skills);

  if (validation.count < 6) {
    issues.push({
      field: "skills",
      code: "skills_too_few",
      severity: "error",
      message: "Add at least 6 skills.",
    });
  }

  if (validation.count > 20) {
    issues.push({
      field: "skills",
      code: "skills_too_many",
      severity: "warning",
      message: "Too many skills — keep it to 20 or fewer.",
    });
  }

  if (validation.banned.length > 0) {
    issues.push({
      field: "skills",
      code: "skills_banned",
      severity: "warning",
      message: `Generic soft skills (remove): ${validation.banned.join(", ")}`,
    });
  }

  const proseSkills = skills.filter((skill) => isProseSkill(skill));
  if (proseSkills.length > 0) {
    issues.push({
      field: "skills",
      code: "skills_prose",
      severity: "warning",
      message: `Use short skill phrases, not sentences: ${proseSkills.join(", ")}`,
    });
  }

  return sectionResult(issues);
}

export function validateExperienceSection(form: HubRefineryForm): SectionValidationResult {
  const issues: ValidationIssue[] = [];
  const visibleEntries = (form.experience ?? []).filter((entry) => entry.hidden !== true);

  if (visibleEntries.length === 0) {
    issues.push({
      field: "experience",
      code: "experience_empty",
      severity: "error",
      message: "Add at least one role.",
    });
    return sectionResult(issues);
  }

  for (let index = 0; index < (form.experience ?? []).length; index += 1) {
    const entry = form.experience[index];
    if (entry.hidden === true) continue;

    const title = entry.title?.trim() ?? "";
    const company = entry.company?.trim() ?? "";
    const startYear = entry.startYear?.trim() ?? "";
    const bullets = entry.bullets?.trim() ?? "";

    if (!title || title.length < 2) {
      issues.push({
        field: `experience[${index}].title`,
        code: "experience_title_required",
        severity: "error",
        message: `Role ${index + 1}: job title is required.`,
      });
    } else if (JUNK_TEXT_PATTERN.test(title)) {
      issues.push({
        field: `experience[${index}].title`,
        code: "experience_title_junk",
        severity: "error",
        message: `Role ${index + 1}: job title looks invalid.`,
      });
    }

    if (!startYear) {
      issues.push({
        field: `experience[${index}].startYear`,
        code: "experience_start_year_required",
        severity: "error",
        message: `Role ${index + 1}: start year is required.`,
      });
    }

    if (!company) {
      issues.push({
        field: `experience[${index}].company`,
        code: "experience_company_empty",
        severity: "warning",
        message: `Role ${index + 1}: company is recommended.`,
      });
    }

    if (!bullets) {
      issues.push({
        field: `experience[${index}].bullets`,
        code: "experience_bullets_empty",
        severity: "warning",
        message: `Role ${index + 1}: add at least one bullet.`,
      });
    }
  }

  const entries = form.experience ?? [];
  const nonHidden = entries.filter((e) => e.hidden !== true);
  const allBulletsEmpty =
    nonHidden.length > 0 && nonHidden.every((e) => !e.bullets?.trim());

  if (allBulletsEmpty) {
    issues.push({
      field: "experience",
      code: "experience_all_bullets_empty",
      severity: "error",
      message:
        "Add bullet points to at least one experience entry — ATS systems need content to evaluate.",
    });
  }

  return sectionResult(issues);
}

export function validateEducationSection(form: HubRefineryForm): SectionValidationResult {
  const issues: ValidationIssue[] = [];

  for (let index = 0; index < (form.education ?? []).length; index += 1) {
    const entry = form.education[index];
    if (entry.hidden === true) continue;

    const degree = entry.degree?.trim() ?? "";
    const school = entry.school?.trim() ?? "";

    if (!degree) {
      issues.push({
        field: `education[${index}].degree`,
        code: "education_degree_empty",
        severity: "warning",
        message: `Education ${index + 1}: degree is recommended.`,
      });
    }

    if (!school) {
      issues.push({
        field: `education[${index}].school`,
        code: "education_school_empty",
        severity: "warning",
        message: `Education ${index + 1}: school is recommended.`,
      });
    } else if (JUNK_TEXT_PATTERN.test(school)) {
      issues.push({
        field: `education[${index}].school`,
        code: "education_school_junk",
        severity: "warning",
        message: `Education ${index + 1}: school looks invalid.`,
      });
    }
  }

  return sectionResult(issues);
}
