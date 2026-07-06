import { describe, expect, it } from "vitest";
import { classifyAiOutput } from "@/lib/ai/call-kernel/classify-ai-output";

describe("classifyAiOutput", () => {
  it("classifies empty text as empty_response", () => {
    expect(classifyAiOutput("   ")).toEqual({ classification: "empty_response" });
  });

  it("classifies invalid JSON as parse_failed", () => {
    expect(classifyAiOutput("not json at all")).toEqual({
      classification: "parse_failed",
    });
  });

  it("classifies valid resume JSON as success", () => {
    const body = {
      professionalSummary: "Experienced engineer.",
      skillsText: "TypeScript, React",
      experience: [],
    };
    const result = classifyAiOutput(JSON.stringify(body));
    expect(result.classification).toBe("success");
    if (result.classification === "success") {
      expect(result.body.professionalSummary).toBe("Experienced engineer.");
    }
  });
});
