import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  coalesceBulletsField,
  normalizeEnhancedBody,
  postProcessProfessionalSummary,
  postProcessSkillsText,
} from "@/src/lib/ai/engine/post-process";

describe("coalesceBulletsField", () => {
  it("joins string arrays into newline-separated text", () => {
    expect(coalesceBulletsField(["Built API", "Led team of 5"])).toBe(
      "Built API\nLed team of 5",
    );
  });

  it("passes through strings unchanged", () => {
    expect(coalesceBulletsField("Line one\nLine two")).toBe("Line one\nLine two");
  });
});

describe("normalizeEnhancedBody", () => {
  it("coerces AI experience bullets arrays to HubRefineryForm strings", () => {
    const original = emptyHubRefineryForm();
    original.experience = [
      {
        id: "exp-0",
        title: "Engineer",
        company: "Acme",
        location: "Remote",
        startMonth: "Jan",
        startYear: "2020",
        endMonth: "Dec",
        endYear: "2023",
        bullets: "Old bullet",
        hidden: false,
      },
    ];

    const normalized = normalizeEnhancedBody(
      {
        experience: [
          {
            id: "exp-0",
            title: "Senior Engineer",
            company: "Acme",
            bullets: ["Built scalable APIs", "Reduced latency 40%"],
          },
        ],
      },
      original,
    );

    expect(normalized.experience[0]?.bullets).toBe(
      "Built scalable APIs\nReduced latency 40%",
    );
    expect(normalized.experience[0]?.title).toBe("Senior Engineer");
    expect(normalized.experience[0]?.startMonth).toBe("Jan");
  });
});

describe("postProcessProfessionalSummary", () => {
  it("replaces banned words with review placeholders", () => {
    expect(
      postProcessProfessionalSummary("A passionate engineer who will leverage APIs."),
    ).toBe("A [review] engineer who will [review] APIs.");
  });
});

describe("postProcessSkillsText", () => {
  it("removes banned and prose skills and trims to 20", () => {
    const input =
      "Communication, Kubernetes, Build cloud systems, TypeScript, Teamwork";
    expect(postProcessSkillsText(input)).toBe("Kubernetes, TypeScript");
  });
});
