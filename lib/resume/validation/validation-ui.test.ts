import { describe, expect, it } from "vitest";
import {
  collectStudioSectionsWithErrors,
  experienceRoleHasBlockingError,
  sectionHasBlockingErrors,
  validationFieldToStudioSection,
} from "@/lib/resume/validation/validation-ui";
import type { ResumeValidationResult } from "@/lib/resume/validation/types";

const emptySection = { issues: [], hasErrors: false, hasWarnings: false };

function result(
  partial: Partial<ResumeValidationResult>,
): ResumeValidationResult {
  return {
    header: emptySection,
    targetRole: emptySection,
    summary: emptySection,
    skills: emptySection,
    experience: emptySection,
    education: emptySection,
    canFinalize: false,
    ...partial,
  };
}

describe("validationFieldToStudioSection", () => {
  it("maps header and experience fields", () => {
    expect(validationFieldToStudioSection("firstName")).toBe("header");
    expect(validationFieldToStudioSection("experience[2].title")).toBe(
      "professionalExperience",
    );
    expect(validationFieldToStudioSection("targetRole")).toBe("profileRole");
  });
});

describe("collectStudioSectionsWithErrors", () => {
  it("returns unique sections with blocking errors", () => {
    const sections = collectStudioSectionsWithErrors(
      result({
        summary: {
          issues: [
            {
              field: "professionalSummary",
              code: "summary_empty",
              severity: "error",
              message: "Required",
            },
          ],
          hasErrors: true,
          hasWarnings: false,
        },
        experience: {
          issues: [
            {
              field: "experience[1].title",
              code: "experience_title_required",
              severity: "error",
              message: "Title required",
            },
            {
              field: "experience[1].startYear",
              code: "experience_start_year_required",
              severity: "error",
              message: "Start year required",
            },
          ],
          hasErrors: true,
          hasWarnings: false,
        },
      }),
    );

    expect(sections).toEqual(["professionalSummary", "professionalExperience"]);
  });

  it("ignores warnings", () => {
    const sections = collectStudioSectionsWithErrors(
      result({
        experience: {
          issues: [
            {
              field: "experience[0].company",
              code: "experience_company_empty",
              severity: "warning",
              message: "Recommended",
            },
          ],
          hasErrors: false,
          hasWarnings: true,
        },
      }),
    );

    expect(sections).toEqual([]);
  });
});

describe("experienceRoleHasBlockingError", () => {
  it("detects role-specific blocking errors", () => {
    const issues = [
      {
        field: "experience[1].title",
        code: "experience_title_required",
        severity: "error" as const,
        message: "Title required",
      },
    ];

    expect(experienceRoleHasBlockingError(issues, 1)).toBe(true);
    expect(experienceRoleHasBlockingError(issues, 0)).toBe(false);
  });
});

describe("sectionHasBlockingErrors", () => {
  it("returns true only when section has error-severity issues", () => {
    expect(
      sectionHasBlockingErrors({
        issues: [
          {
            field: "skills",
            code: "skills_too_few",
            severity: "error",
            message: "Add at least 6 skills.",
          },
        ],
        hasErrors: true,
        hasWarnings: false,
      }),
    ).toBe(true);

    expect(
      sectionHasBlockingErrors({
        issues: [
          {
            field: "experience[0].company",
            code: "experience_company_empty",
            severity: "warning",
            message: "Recommended",
          },
        ],
        hasErrors: false,
        hasWarnings: true,
      }),
    ).toBe(false);
  });
});
