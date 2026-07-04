import { describe, expect, it, vi } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { runCoverLetterEnhance } from "@/src/lib/ai/engine/run-cover-letter-enhance";

vi.mock("@/src/lib/ai/engine/run-enhance", () => ({
  callEnhanceModel: vi.fn(),
}));

vi.mock("@/src/lib/ai/engine/system-key-pool", () => ({
  SystemKeyPoolError: class SystemKeyPoolError extends Error {
    code = "capacity_exhausted";
  },
}));

import { callEnhanceModel } from "@/src/lib/ai/engine/run-enhance";

const baseInput = {
  form: {
    ...emptyHubRefineryForm(),
    firstName: "Bhagath",
    lastName: "Siddi",
    professionalSummary: "Program manager with 10+ years leading cross-functional teams.",
    skillsText: "Program management, Agile, Stakeholder management",
    experience: [
      {
        id: "1",
        title: "Senior Manager",
        company: "Acme",
        location: "TX",
        startMonth: "01",
        startYear: "2020",
        endMonth: "",
        endYear: "",
        bullets: "- Led $12M portfolio\n- Managed 15 engineers",
        hidden: false,
      },
    ],
  },
  targetTitle: "Senior Manager, Program Management",
  company: "Walmart",
  jobTitle: "Senior Manager, Program Management",
  jobDescription:
    "Lead program management for enterprise initiatives. Requires Agile, stakeholder management, and delivery at scale.",
  route: { mode: "system" as const, provider: "gemini" as const, modelId: "gemini-2.0-flash" },
  traceId: "test-trace",
};

describe("runCoverLetterEnhance", () => {
  it("falls back to deterministic letter when the provider throws", async () => {
    vi.mocked(callEnhanceModel).mockRejectedValue(new Error("Provider unavailable"));

    const result = await runCoverLetterEnhance(baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fallbackUsed).toBe(true);
    expect(result.body.length).toBeGreaterThan(80);
    expect(result.modelId).toBe("deterministic");
  });
});
