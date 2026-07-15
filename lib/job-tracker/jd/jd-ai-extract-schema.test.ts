import { describe, expect, it } from "vitest";
import { jdAiExtractSchema } from "@/lib/job-tracker/jd/jd-ai-extract-schema";

describe("jdAiExtractSchema", () => {
  it("applies defaults when free models omit optional arrays", () => {
    const parsed = jdAiExtractSchema.parse({
      mustHaveSkills: ["AWS", "Java"],
      preferredSkills: [],
      summaryTheme: "Engineering leadership",
      emphasisAreas: ["Cloud Infrastructure"],
    });

    expect(parsed.targetVerbs).toEqual([]);
    expect(parsed.deliverables).toEqual([]);
    expect(parsed.impactDimensions).toEqual([]);
    expect(parsed.mustHaveSkills).toEqual(["AWS", "Java"]);
  });
});
