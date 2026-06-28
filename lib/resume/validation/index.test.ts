import { describe, expect, it } from "vitest";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  collectValidationErrorMessages,
  validateResume,
} from "@/lib/resume/validation/index";

const VALID_FORM: HubRefineryForm = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "+1 415 555 0100",
  cityState: "San Francisco, CA",
  linkedIn: "linkedin.com/in/jane",
  professionalSummary: "Senior engineer with eight years of platform experience.",
  skillsText: "TypeScript, React, Node.js, PostgreSQL, AWS, Docker",
  experience: [
    {
      id: "exp-0",
      title: "Senior Engineer",
      company: "Acme",
      location: "SF",
      startMonth: "Jan",
      startYear: "2020",
      endMonth: "",
      endYear: "Present",
      bullets: "Built scalable APIs serving 1M requests daily",
      hidden: false,
    },
  ],
  education: [
    {
      id: "edu-0",
      school: "UC Berkeley",
      degree: "B.S. CS",
      location: "",
      startMonth: "",
      startYear: "2012",
      endMonth: "",
      endYear: "2016",
      hidden: false,
    },
  ],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
  pageLengthPreference: "auto",
};

describe("validateResume", () => {
  it("passes a complete form", () => {
    const result = validateResume(VALID_FORM, "Senior Software Engineer");
    expect(result.canFinalize).toBe(true);
    expect(result.header.hasErrors).toBe(false);
  });

  it("fails when target role missing", () => {
    const result = validateResume(VALID_FORM, "");
    expect(result.canFinalize).toBe(false);
    expect(result.targetRole.hasErrors).toBe(true);
  });

  it("collectValidationErrorMessages returns error strings only", () => {
    const result = validateResume({ ...VALID_FORM, email: "" }, "");
    const messages = collectValidationErrorMessages(result);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every((m) => typeof m === "string")).toBe(true);
  });
});
