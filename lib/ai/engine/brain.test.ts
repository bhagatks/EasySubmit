import { describe, it, expect } from "vitest";
import { buildDirectiveBlock, buildEnhanceUserPrompt } from "@/src/lib/ai/engine/brain";
import { stripContactFromForm, type CandidateContext } from "@/src/lib/ai/engine/candidate-context";
import type { AtsOptimizationSpec } from "@/lib/job-tracker/ats/build-ats-optimization-spec";
import type { ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

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

describe("buildEnhanceUserPrompt", () => {
  it("prioritizes the raw source resume as the fact bank", () => {
    const ctx = {
      targetRole: "Director, AI/ML and Data Architecture",
      yearsExperienceEstimate: 20,
      senioritySignal: "executive",
      pageBudget: {
        pages: 2,
        maxRolesDetailed: 4,
        maxSkills: 20,
        summarySentencesMax: 4,
      },
      resumeBody: stripContactFromForm(emptyHubRefineryForm()),
      rawResumeSource: "CVS Pay patent, FIDO Alliance, 7Now OMS, 10x productivity.",
    } satisfies CandidateContext;

    const spec = {
      mode: "jd_full",
      targetRole: "Director, AI/ML and Data Architecture",
      platform: {
        id: "workday",
        label: "Workday",
        strategy: "parse_first",
        strategyInstructions: "Use Workday-safe resume formatting.",
        tip: "Use plain sections.",
      },
      readiness: {
        total: 0,
        grade: "F",
        pillars: {
          completeness: { label: "Completeness", score: 0, maxScore: 25, details: [] },
          keywords: { label: "Keyword Match", score: 0, maxScore: 25, details: [] },
          bulletQuality: { label: "Bullet Quality", score: 0, maxScore: 25, details: [] },
          atsCompliance: { label: "ATS Compliance", score: 0, maxScore: 25, details: [] },
        },
        topActions: [],
      },
      lightPath: true,
      yearsExperienceEstimate: 20,
    } satisfies AtsOptimizationSpec;

    const prompt = buildEnhanceUserPrompt(ctx, spec);

    expect(prompt).toContain("SOURCE RESUME");
    expect(prompt).toContain("CVS Pay patent");
    expect(prompt).toContain("do not discard named products, partners, patents");
  });
});
