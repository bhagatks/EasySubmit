import { describe, it, expect } from "vitest";
import { buildDirectiveBlock } from "@/src/lib/ai/engine/brain";
import type { ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";

function baseDirective(overrides: Partial<ResumeEnhanceDirective> = {}): ResumeEnhanceDirective {
  return {
    mustAddSkills: [],
    mustRemoveSkills: [],
    mustWeaveKeywords: [],
    effectiveTargetRole: "Senior Engineer",
    roleLevel: "senior",
    scope: "ic",
    targetVerbs: [],
    impactDimensions: [],
    quantHints: [],
    summaryTheme: "",
    emphasisAreas: [],
    deprioritize: [],
    cultureSignals: { velocity: null, ownership: null, industry: [] },
    ...overrides,
  };
}

describe("buildDirectiveBlock", () => {
  it("includes culture signals when present", () => {
    const block = buildDirectiveBlock(
      baseDirective({
        cultureSignals: {
          velocity: "fast",
          ownership: "high",
          industry: ["fintech"],
        },
      }),
    );
    expect(block).toContain("CULTURE / TONE");
    expect(block).toContain("pace: fast");
    expect(block).toContain("ownership: high");
    expect(block).toContain("industry: fintech");
  });

  it("includes verb fit guardrail", () => {
    const block = buildDirectiveBlock(
      baseDirective({ targetVerbs: ["designed", "deployed"] }),
    );
    expect(block).toContain("prefer these verbs");
    expect(block).toContain("Do NOT force every verb");
  });

  it("always includes role context", () => {
    const block = buildDirectiveBlock(baseDirective());
    expect(block).toContain("ROLE CONTEXT: senior · ic");
  });
});
