import { describe, expect, it } from "vitest";
import {
  buildResumeDetailDraft,
  normalizeResumeDetailDraft,
  resumeDetailDraftsEqual,
  mergedFormToResumeDetailDraft,
  applyResumeDetailDraftToForm,
} from "@/src/shared/extension/resume-detail-edit";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

describe("resume-detail-edit", () => {
  it("normalizes scalar resume fields", () => {
    expect(
      normalizeResumeDetailDraft(
        buildResumeDetailDraft({
          targetTitle: " Engineer ",
          firstName: " Ada ",
          lastName: " Lovelace ",
          email: " ada@example.com ",
          phone: " 555 ",
          cityState: " London ",
          linkedIn: " linkedin.com/in/ada ",
          professionalSummary: " Summary ",
          skillsText: " TypeScript ",
        }),
      ),
    ).toEqual({
      targetTitle: "Engineer",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "555",
      cityState: "London",
      linkedIn: "linkedin.com/in/ada",
      professionalSummary: "Summary",
      skillsText: "TypeScript",
    });
  });

  it("merges draft back into hub form without dropping sections", () => {
    const base = {
      ...emptyHubRefineryForm(),
      firstName: "Old",
      professionalSummary: "Old summary",
      experience: [{ id: "1", title: "Dev", company: "Co", location: "", startMonth: "", startYear: "", endMonth: "", endYear: "", bullets: "Built things" }],
    };
    const draft = mergedFormToResumeDetailDraft(base, "Staff Engineer");
    draft.firstName = "New";
    draft.professionalSummary = "New summary";

    const next = applyResumeDetailDraftToForm(base, draft);
    expect(next.firstName).toBe("New");
    expect(next.professionalSummary).toBe("New summary");
    expect(next.experience).toEqual(base.experience);
  });

  it("detects dirty state via draft comparison", () => {
    const left = buildResumeDetailDraft({
      targetTitle: "Engineer",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "",
      phone: "",
      cityState: "",
      linkedIn: "",
      professionalSummary: "",
      skillsText: "",
    });
    const right = { ...left, skillsText: "Rust" };
    expect(resumeDetailDraftsEqual(left, right)).toBe(false);
  });
});
