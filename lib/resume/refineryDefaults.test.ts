import { describe, expect, it } from "vitest";
import { buildRefineryDefaults } from "@/lib/resume/refineryDefaults";

describe("buildRefineryDefaults", () => {
  it("prefers parsed resume fields over session fallbacks", () => {
    const { values, verified } = buildRefineryDefaults({
      parsed: {
        rawText: "Jane Doe\nSenior Engineer at Acme Corp\njane@example.com",
        email: "jane@example.com",
        phone: "(415) 555-0100",
        skills: ["TypeScript", "Leadership", "Agile"],
      },
      sessionFirstName: "John",
      sessionLastName: "Smith",
      sessionEmail: "john@example.com",
    });

    expect(values.fullName).toBe("Jane Doe");
    expect(values.email).toBe("jane@example.com");
    expect(values.coreCompetencies).toContain("Leadership");
    expect(values.technicalSkills).toContain("TypeScript");
    expect(verified.fullName).toBe(true);
    expect(verified.experiences).toBe(true);
  });

  it("falls back to session identity when parser has no name", () => {
    const { values } = buildRefineryDefaults({
      parsed: null,
      sessionFirstName: "Jane",
      sessionLastName: "Doe",
      sessionEmail: "jane@example.com",
    });
    expect(values.fullName).toBe("Jane Doe");
    expect(values.email).toBe("jane@example.com");
  });
});
