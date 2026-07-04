import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildJDExtractionPrompt,
  jdExtractionRoute,
  mergeAIIntoIntelligence,
} from "@/lib/job-tracker/jd/jd-ai-extractor";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import {
  buildJdDraftPromptBlock,
  truncateSegmentForAi,
} from "@/lib/job-tracker/jd/jd-prompt-segments";
import { canonicalizeMasterSkill, canonicalizeMasterSkills } from "@/lib/job-tracker/jd/skill-canonicalize";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";
import { checkAiQuota } from "@/src/lib/ai/engine/quota";

vi.mock("@/src/lib/ai/engine/run-enhance", () => ({
  callEnhanceObjectModel: vi.fn(),
}));

const { callEnhanceObjectModel } = await import("@/src/lib/ai/engine/run-enhance");

describe("jdExtractionRoute", () => {
  it("returns the enhance route unchanged for system mode", () => {
    const route = { mode: "system" as const, modelId: "gemini-2.5-flash" };
    expect(jdExtractionRoute(route)).toBe(route);
  });

  it("returns the enhance route unchanged for BYOK (same model as resume AI)", () => {
    const customerRoute = {
      mode: "customer" as const,
      vaultKeyId: "vk_1",
      provider: "anthropic" as const,
      modelId: "claude-opus-4-5-20251101",
      modelCandidates: ["claude-opus-4-5-20251101", "claude-sonnet-4-5-20250929"],
    };
    expect(jdExtractionRoute(customerRoute)).toBe(customerRoute);
  });
});

describe("extractJDIntelligenceWithAI quota", () => {
  beforeEach(() => {
    vi.mocked(callEnhanceObjectModel).mockReset();
  });

  it("returns quota reason without calling the model when system call limit exceeded", async () => {
    const { extractJDIntelligenceWithAI } = await import("@/lib/job-tracker/jd/jd-ai-extractor");
    const quotaRow = {
      aiEnhancementsToday: 0,
      aiCallsToday: AI_ENGINE_DEFAULTS.quotas.system.dailyCalls,
      aiQuotaResetAt: new Date(),
    };
    const atLimit = checkAiQuota(quotaRow, AI_ENGINE_DEFAULTS, "system", { estimatedCalls: 1 });
    expect(atLimit.ok).toBe(false);

    const result = await extractJDIntelligenceWithAI(
      {
        requirements: "Python",
        responsibilities: "Build APIs",
        preferred: "",
        context: "",
        source: "heuristic",
        wordCount: { requirements: 1, responsibilities: 2, preferred: 0 },
      },
      "Engineer",
      { mode: "system", modelId: "gemini-2.5-flash-lite" },
      "trace-1",
      "user-1",
      { quotaContext: { quotaRow, aiEngine: AI_ENGINE_DEFAULTS } },
    );

    expect(result).toEqual({ ok: false, reason: "quota" });
    expect(callEnhanceObjectModel).not.toHaveBeenCalled();
  });
});

describe("truncateSegmentForAi", () => {
  it("returns empty for blank input", () => {
    expect(truncateSegmentForAi("  ", 10)).toBe("");
  });

  it("truncates at word boundary with ellipsis", () => {
    const text = "one two three four five six";
    expect(truncateSegmentForAi(text, 3)).toBe("one two three…");
  });

  it("returns full text when under limit", () => {
    expect(truncateSegmentForAi("one two", 5)).toBe("one two");
  });
});

describe("buildJdDraftPromptBlock", () => {
  it("uses requirements + responsibilities only", () => {
    const block = buildJdDraftPromptBlock({
      requirements: "Python required",
      responsibilities: "Build APIs",
      preferred: "GraphQL nice",
      context: "About Acme Corp",
      source: "heuristic",
      wordCount: { requirements: 2, responsibilities: 2, preferred: 2 },
    });
    expect(block).toContain("REQUIREMENTS:");
    expect(block).toContain("Python required");
    expect(block).toContain("RESPONSIBILITIES:");
    expect(block).toContain("Build APIs");
    expect(block).not.toContain("GraphQL");
    expect(block).not.toContain("About Acme");
  });
});

describe("canonicalizeMasterSkill", () => {
  it("maps react.js alias to React", () => {
    expect(canonicalizeMasterSkill("react.js")).toBe("React");
  });

  it("returns null for unknown skill", () => {
    expect(canonicalizeMasterSkill("ObscureFrameworkXYZ")).toBeNull();
  });

  it("dedupes canonical list", () => {
    expect(canonicalizeMasterSkills(["Python", "python", "react.js", "React"])).toEqual([
      "Python",
      "React",
    ]);
  });
});

describe("buildJDExtractionPrompt", () => {
  it("includes context when present", () => {
    const prompt = buildJDExtractionPrompt(
      {
        requirements: "AWS required",
        responsibilities: "Deploy services",
        preferred: "",
        context: "Fintech startup",
        source: "heuristic",
        wordCount: { requirements: 2, responsibilities: 2, preferred: 0 },
      },
      "Engineer",
    );
    expect(prompt).toContain("CONTEXT:");
    expect(prompt).toContain("Fintech startup");
    expect(prompt).not.toContain("Return ONLY valid JSON");
  });

  it("promotes responsibilities into requirements when requirements section is empty", () => {
    const prompt = buildJDExtractionPrompt(
      {
        requirements: "",
        responsibilities: "Lead data architecture and generative AI platform work.",
        preferred: "",
        context: "",
        source: "header",
        wordCount: { requirements: 0, responsibilities: 8, preferred: 0 },
      },
      "Director, AI/ML",
    );
    expect(prompt).toContain("Lead data architecture");
    expect(prompt).not.toContain('REQUIREMENTS:\n"""\n(not found)');
  });
});

describe("mergeAIIntoIntelligence", () => {
  it("canonicalizes mustHaveSkills from AI output", () => {
    const base = makeEmptyIntelligence();
    const merged = mergeAIIntoIntelligence(base, {
      mustHaveSkills: ["python", "react.js", "ObscureTool"],
    });
    expect(merged.mustHaveSkills).toContain("Python");
    expect(merged.mustHaveSkills).toContain("React");
    expect(merged.mustHaveSkills).not.toContain("ObscureTool");
    expect(merged.source).toBe("hybrid");
  });

  it("filters invalid impact dimensions", () => {
    const merged = mergeAIIntoIntelligence(makeEmptyIntelligence(), {
      impactDimensions: ["reliability", "invalid-dim" as never],
    });
    expect(merged.impactDimensions).toEqual(["reliability"]);
  });
});
