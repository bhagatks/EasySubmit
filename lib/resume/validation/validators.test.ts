import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  validateEducationSection,
  validateExperienceSection,
  validateHeader,
  validateSkillsSection,
  validateSummarySection,
  validateTargetRole,
} from "@/lib/resume/validation/validators";

function validHeaderForm(overrides: Partial<HubRefineryForm> = {}): HubRefineryForm {
  return {
    ...emptyHubRefineryForm(),
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+1 (555) 123-4567",
    cityState: "London, UK",
    ...overrides,
  };
}

const VALID_SUMMARY =
  "Experienced software engineer with a focus on backend systems and API design. " +
  "Led cross-functional teams to deliver scalable services used by millions of users daily. " +
  "Skilled in TypeScript, Node.js, PostgreSQL, and cloud infrastructure on AWS and GCP. " +
  "Seeking senior engineering roles where reliability, clarity, and measurable impact matter most.";

const CLEAN_SKILLS = [
  "TypeScript",
  "Node.js",
  "PostgreSQL",
  "React",
  "AWS",
  "Docker",
  "GraphQL",
  "Redis",
  "Kubernetes",
  "Terraform",
];

describe("validateHeader", () => {
  it("flags empty firstName as error", () => {
    const result = validateHeader(validHeaderForm({ firstName: "" }));
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "header_first_name_required")).toBe(
      true,
    );
  });

  it("flags invalid email as error", () => {
    const result = validateHeader(validHeaderForm({ email: "not-an-email" }));
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "header_email_invalid")).toBe(true);
  });

  it("flags empty lastName as warning", () => {
    const result = validateHeader(validHeaderForm({ lastName: "" }));
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "header_last_name_empty")).toBe(true);
  });

  it("flags empty cityState as warning", () => {
    const result = validateHeader(validHeaderForm({ cityState: "" }));
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "header_city_state_empty")).toBe(true);
  });

  it("returns no issues when all fields are valid", () => {
    const result = validateHeader(validHeaderForm());
    expect(result.issues).toHaveLength(0);
    expect(result.hasErrors).toBe(false);
    expect(result.hasWarnings).toBe(false);
  });

  it('flags invalid LinkedIn "not-a-url" as warning', () => {
    const result = validateHeader(validHeaderForm({ linkedIn: "not-a-url" }));
    expect(result.hasErrors).toBe(false);
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "header_linkedin_invalid")).toBe(true);
  });

  it('accepts valid LinkedIn "https://linkedin.com/in/johndoe" with no warning', () => {
    const result = validateHeader(
      validHeaderForm({ linkedIn: "https://linkedin.com/in/johndoe" }),
    );
    expect(result.issues.some((issue) => issue.code === "header_linkedin_invalid")).toBe(false);
  });
});

describe("validateTargetRole", () => {
  it("flags empty string as error", () => {
    const result = validateTargetRole("");
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "target_role_required")).toBe(true);
  });

  it('flags "a" as error', () => {
    const result = validateTargetRole("a");
    expect(result.hasErrors).toBe(true);
  });

  it('flags "ok" as error', () => {
    const result = validateTargetRole("ok");
    expect(result.hasErrors).toBe(true);
  });

  it('accepts "Software Engineer" with no errors', () => {
    const result = validateTargetRole("Software Engineer");
    expect(result.hasErrors).toBe(false);
  });

  it("flags strings over 100 chars as warning", () => {
    const result = validateTargetRole("A".repeat(101));
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "target_role_too_long")).toBe(true);
  });
});

describe("validateSummarySection", () => {
  it("flags empty summary as error", () => {
    const result = validateSummarySection(validHeaderForm({ professionalSummary: "" }));
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "summary_empty")).toBe(true);
  });

  it('flags banned word "leverage" as warning', () => {
    const result = validateSummarySection(
      validHeaderForm({ professionalSummary: "I leverage tools to build software." }),
    );
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "summary_banned_words")).toBe(true);
  });

  it("accepts valid 4-sentence 70-80 word summary with no errors", () => {
    const result = validateSummarySection(
      validHeaderForm({ professionalSummary: VALID_SUMMARY }),
    );
    expect(result.hasErrors).toBe(false);
  });
});

describe("validateSkillsSection", () => {
  it("flags empty array as error", () => {
    const result = validateSkillsSection([]);
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "skills_too_few")).toBe(true);
  });

  it("flags 5 skills as error", () => {
    const result = validateSkillsSection(CLEAN_SKILLS.slice(0, 5));
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "skills_too_few")).toBe(true);
  });

  it("flags 21 skills as warning", () => {
    const skills = [
      ...CLEAN_SKILLS,
      "Python",
      "Java",
      "Go",
      "Rust",
      "C#",
      "Swift",
      "Kotlin",
      "Ruby",
      "PHP",
      "Scala",
      "Elixir",
    ];
    expect(skills.length).toBe(21);
    const result = validateSkillsSection(skills);
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "skills_too_many")).toBe(true);
  });

  it('flags "teamwork" as warning', () => {
    const result = validateSkillsSection([...CLEAN_SKILLS.slice(0, 6), "teamwork"]);
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "skills_banned")).toBe(true);
  });

  it("accepts 10 clean skills with no issues", () => {
    const result = validateSkillsSection(CLEAN_SKILLS);
    expect(result.issues).toHaveLength(0);
  });
});

describe("validateExperienceSection", () => {
  const baseForm = validHeaderForm();

  it("flags empty experience array as error", () => {
    const result = validateExperienceSection(validHeaderForm({ experience: [] }));
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "experience_empty")).toBe(true);
  });

  it("flags all hidden entries as error", () => {
    const result = validateExperienceSection(
      validHeaderForm({
        experience: [
          {
            id: "exp-1",
            title: "Engineer",
            company: "Acme",
            location: "",
            startMonth: "Jan",
            startYear: "2020",
            endMonth: "",
            endYear: "Present",
            bullets: "Built things.",
            hidden: true,
          },
        ],
      }),
    );
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "experience_empty")).toBe(true);
  });

  it('flags junk title "###" as error', () => {
    const result = validateExperienceSection(
      validHeaderForm({
        experience: [
          {
            id: "exp-1",
            title: "###",
            company: "Acme",
            location: "",
            startMonth: "Jan",
            startYear: "2020",
            endMonth: "",
            endYear: "",
            bullets: "Built things.",
          },
        ],
      }),
    );
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "experience_title_junk")).toBe(true);
  });

  it("flags empty title as error", () => {
    const result = validateExperienceSection(
      validHeaderForm({
        experience: [
          {
            id: "exp-1",
            title: "",
            company: "Acme",
            location: "",
            startMonth: "Jan",
            startYear: "2020",
            endMonth: "",
            endYear: "",
            bullets: "Built things.",
          },
        ],
      }),
    );
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "experience_title_required")).toBe(
      true,
    );
  });

  it("flags missing startYear as error", () => {
    const result = validateExperienceSection(
      validHeaderForm({
        experience: [
          {
            id: "exp-1",
            title: "Engineer",
            company: "Acme",
            location: "",
            startMonth: "Jan",
            startYear: "",
            endMonth: "",
            endYear: "",
            bullets: "Built things.",
          },
        ],
      }),
    );
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "experience_start_year_required")).toBe(
      true,
    );
  });

  it("flags empty bullets as warning", () => {
    const result = validateExperienceSection(
      validHeaderForm({
        experience: [
          {
            id: "exp-1",
            title: "Engineer",
            company: "Acme",
            location: "",
            startMonth: "Jan",
            startYear: "2020",
            endMonth: "",
            endYear: "",
            bullets: "",
          },
        ],
      }),
    );
    expect(result.hasWarnings).toBe(true);
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.code === "experience_bullets_empty")).toBe(true);
    expect(
      result.issues.some((issue) => issue.code === "experience_all_bullets_empty"),
    ).toBe(true);
  });

  it("all entries have empty bullets → error experience_all_bullets_empty", () => {
    const form = {
      ...baseForm,
      experience: [
        {
          id: "1",
          title: "Engineer",
          company: "Acme",
          location: "",
          startMonth: "",
          startYear: "2020",
          endMonth: "",
          endYear: "",
          bullets: "",
          hidden: false,
        },
        {
          id: "2",
          title: "Analyst",
          company: "Corp",
          location: "",
          startMonth: "",
          startYear: "2019",
          endMonth: "",
          endYear: "",
          bullets: "   ",
          hidden: false,
        },
      ],
    };
    const result = validateExperienceSection(form as HubRefineryForm);
    expect(
      result.issues.some(
        (i) => i.code === "experience_all_bullets_empty" && i.severity === "error",
      ),
    ).toBe(true);
  });

  it("one entry has bullets → no experience_all_bullets_empty error", () => {
    const form = {
      ...baseForm,
      experience: [
        {
          id: "1",
          title: "Engineer",
          company: "Acme",
          location: "",
          startMonth: "",
          startYear: "2020",
          endMonth: "",
          endYear: "",
          bullets: "Built things",
          hidden: false,
        },
        {
          id: "2",
          title: "Analyst",
          company: "Corp",
          location: "",
          startMonth: "",
          startYear: "2019",
          endMonth: "",
          endYear: "",
          bullets: "",
          hidden: false,
        },
      ],
    };
    const result = validateExperienceSection(form as HubRefineryForm);
    expect(result.issues.some((i) => i.code === "experience_all_bullets_empty")).toBe(false);
  });

  it("accepts valid entry with no errors", () => {
    const result = validateExperienceSection(
      validHeaderForm({
        experience: [
          {
            id: "exp-1",
            title: "Software Engineer",
            company: "Acme Corp",
            location: "Remote",
            startMonth: "Jan",
            startYear: "2020",
            endMonth: "Dec",
            endYear: "2023",
            bullets: "Built scalable APIs.",
          },
        ],
      }),
    );
    expect(result.hasErrors).toBe(false);
  });
});

describe("validateEducationSection", () => {
  it("flags empty degree as warning", () => {
    const result = validateEducationSection(
      validHeaderForm({
        education: [
          {
            id: "edu-1",
            degree: "",
            school: "MIT",
            location: "",
            startMonth: "",
            startYear: "",
            endMonth: "",
            endYear: "",
          },
        ],
      }),
    );
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "education_degree_empty")).toBe(true);
  });

  it("returns no issues when all entries are hidden", () => {
    const result = validateEducationSection(
      validHeaderForm({
        education: [
          {
            id: "edu-1",
            degree: "",
            school: "",
            location: "",
            startMonth: "",
            startYear: "",
            endMonth: "",
            endYear: "",
            hidden: true,
          },
        ],
      }),
    );
    expect(result.issues).toHaveLength(0);
  });

  it("accepts valid entry with no issues", () => {
    const result = validateEducationSection(
      validHeaderForm({
        education: [
          {
            id: "edu-1",
            degree: "BS Computer Science",
            school: "MIT",
            location: "Cambridge, MA",
            startMonth: "Sep",
            startYear: "2016",
            endMonth: "May",
            endYear: "2020",
          },
        ],
      }),
    );
    expect(result.issues).toHaveLength(0);
  });

  it('flags junk school "####" as warning', () => {
    const result = validateEducationSection(
      validHeaderForm({
        education: [
          {
            id: "edu-1",
            degree: "BS Computer Science",
            school: "####",
            location: "",
            startMonth: "",
            startYear: "",
            endMonth: "",
            endYear: "",
          },
        ],
      }),
    );
    expect(result.hasErrors).toBe(false);
    expect(result.hasWarnings).toBe(true);
    expect(result.issues.some((issue) => issue.code === "education_school_junk")).toBe(true);
  });
});
