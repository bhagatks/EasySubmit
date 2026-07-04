import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  canPersistProfileStudio,
  profileStudioPersistErrors,
} from "@/lib/profile/profile-studio-persist";

const VALID_SUMMARY =
  "Experienced software engineer with a focus on backend systems and API design. " +
  "Led cross-functional teams to deliver scalable services used by millions of users daily. " +
  "Skilled in TypeScript, Node.js, PostgreSQL, and cloud infrastructure on AWS and GCP. " +
  "Seeking senior engineering roles where reliability, clarity, and measurable impact matter most.";

const SKILLS = [
  "TypeScript",
  "Node.js",
  "PostgreSQL",
  "React",
  "AWS",
  "Docker",
];

function validForm() {
  return {
    ...emptyHubRefineryForm(),
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+1 415 555 0100",
    cityState: "London, UK",
    linkedIn: "https://linkedin.com/in/ada",
    professionalSummary: VALID_SUMMARY,
    skillsText: SKILLS.join(", "),
  };
}

describe("canPersistProfileStudio", () => {
  it("allows save when header, role, and skills are valid", () => {
    expect(canPersistProfileStudio(validForm(), "Staff Engineer", SKILLS)).toBe(true);
  });

  it("allows save even when summary would fail full finalize validation", () => {
    expect(
      canPersistProfileStudio(
        validForm({ professionalSummary: "Too short." }),
        "Staff Engineer",
        SKILLS,
      ),
    ).toBe(true);
  });

  it("blocks save without profile role name", () => {
    expect(canPersistProfileStudio(validForm(), "", SKILLS)).toBe(false);
    expect(profileStudioPersistErrors(validForm(), "", SKILLS)).toContain(
      "Profile role name is required before saving.",
    );
  });

  it("blocks save with too few skills", () => {
    expect(canPersistProfileStudio(validForm(), "Engineer", ["TypeScript"])).toBe(false);
  });
});
