import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { summarizeFormDelta } from "@/src/lib/ai/engine/enhance-logger";

describe("summarizeFormDelta", () => {
  it("reports summary and skills changes", () => {
    const before = {
      ...emptyHubRefineryForm(),
      professionalSummary: "Original summary.",
      skillsText: "TypeScript, React",
      experience: [
        {
          id: "1",
          title: "Engineer",
          company: "Acme",
          location: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
          bullets: "- Built systems\n- Improved uptime",
          hidden: false,
        },
      ],
    };

    const after = {
      ...before,
      professionalSummary: "Tailored summary for the role.",
      skillsText: "TypeScript, React, AWS, Kubernetes",
      experience: [
        {
          ...before.experience[0]!,
          bullets: "- Built systems\n- Improved uptime\n- Led migrations",
        },
      ],
    };

    const delta = summarizeFormDelta(before, after);
    expect(delta.summaryChanged).toBe(true);
    expect(delta.skillsChanged).toBe(true);
    expect(delta.skillsCountBefore).toBe(2);
    expect(delta.skillsCountAfter).toBe(4);
    expect(delta.experienceBulletsAfter[0]?.bulletCount).toBe(3);
  });
});
