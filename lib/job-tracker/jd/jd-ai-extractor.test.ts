import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildJDExtractionPrompt,
  mergeAIIntoIntelligence,
} from "@/lib/job-tracker/jd/jd-ai-extractor";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import {
  buildJdDraftPromptBlock,
  truncateSegmentForAi,
} from "@/lib/job-tracker/jd/jd-prompt-segments";
import { canonicalizeMasterSkill, canonicalizeMasterSkills } from "@/lib/job-tracker/jd/skill-canonicalize";

vi.mock("@/src/lib/ai/engine/run-enhance", () => ({
  callEnhanceObjectModel: vi.fn(),
}));

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
