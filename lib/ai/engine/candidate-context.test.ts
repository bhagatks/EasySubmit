import { describe, expect, it } from "vitest";
import { stripContactFromForm, estimateYearsExperience } from "@/src/lib/ai/engine/candidate-context";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

describe("candidate-context", () => {
  it("strips contact fields from AI payload", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+1 555",
      linkedIn: "linkedin.com/in/ada",
      cityState: "London, UK",
      professionalSummary: "Engineer",
    };

    const body = stripContactFromForm(form);
    expect(body).not.toHaveProperty("firstName");
    expect(body).not.toHaveProperty("email");
    expect(body.professionalSummary).toBe("Engineer");
  });

  it("estimates years experience from earliest role", () => {
    const form = emptyHubRefineryForm();
    form.experience = [
      {
        id: "1",
        title: "Engineer",
        company: "Co",
        location: "",
        startMonth: "01",
        startYear: String(new Date().getFullYear() - 8),
        endMonth: "",
        endYear: "",
        bullets: "",
      },
    ];
    expect(estimateYearsExperience(form)).toBeGreaterThanOrEqual(7);
  });
});
