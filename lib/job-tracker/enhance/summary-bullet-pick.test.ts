import { describe, expect, it } from "vitest";
import { pickStrongestExperienceBulletForSummary } from "@/lib/job-tracker/enhance/summary-bullet-pick";

describe("pickStrongestExperienceBulletForSummary", () => {
  it("prefers quantified metric bullets over product-name digits (7Now)", () => {
    const sentence = pickStrongestExperienceBulletForSummary([
      {
        bullets:
          "Led the 7Now Delivery Platform engineering initiatives, directing a high-performing team of API engineers.\nImplemented Agentic AI capability within the engineering org, deploying AI-assisted workflows that increased productivity by 10x and reduced manual toil.",
      },
    ]);

    expect(sentence.toLowerCase()).toContain("10x");
    expect(sentence).not.toMatch(/team of API\.$/);
  });
});
