/**
 * Regression coverage for v2 wiring paths not exercised elsewhere.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildTailoredResumePreview } from "@/lib/job-tracker/build-tailored-resume-preview";
import { buildResumeContentFromForm } from "@/lib/job-tracker/export/resume-content-model";
import { validateResume } from "@/lib/resume/validation/index";
import { EXTENDED_MODE_ATS_WARNING_CODE } from "@/lib/resume/v2/rules-config";
import type { ResumePageModeV2 } from "@/lib/resume/v2/page-mode";
import {
  isResumeRulesV2Enabled,
  resolveResumeRulesV2ForPageMode,
} from "@/lib/resume/v2/runtime";
import { buildEnhanceSystemPromptV2 } from "@/src/lib/ai/engine/brain";
import { buildCandidateContext } from "@/src/lib/ai/engine/candidate-context";

const V2_PAGE_MODES: ResumePageModeV2[] = ["1", "2", "3", "4+"];

function formWithEightBullets(pageLengthPreference: ResumePageModeV2) {
  const bullets = Array.from({ length: 8 }, (_, i) => `Delivered outcome ${i + 1} with 12% gain.`);
  return {
    ...emptyHubRefineryForm(),
    pageLengthPreference,
    experience: [
      {
        id: "1",
        title: "Director",
        company: "Acme",
        location: "",
        startMonth: "Jan",
        startYear: "2020",
        endMonth: "",
        endYear: "Present",
        bullets: bullets.join("\n"),
        hidden: false,
      },
    ],
  };
}

describe("export bullet cap regression", () => {
  it.each(V2_PAGE_MODES)("does not cap bullets for v2 page mode %s", (mode) => {
    const content = buildResumeContentFromForm(formWithEightBullets(mode), "Director");
    expect(content.experience[0]?.bullets).toHaveLength(8);
    expect(content.warnings.some((w) => w.includes("6 bullets"))).toBe(false);
  });

  it("still caps bullets for v1 auto preference", () => {
    const form = { ...formWithEightBullets("2"), pageLengthPreference: "auto" as const };
    const content = buildResumeContentFromForm(form, "Director");
    expect(content.experience[0]?.bullets.length).toBeLessThanOrEqual(6);
  });
});

describe("studio validation bridge (useRulesV2)", () => {
  it("maps 4+ extended warning into experience/layout issues", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+1 415 555 0100",
      cityState: "Austin, TX",
      pageLengthPreference: "4+" as const,
      professionalSummary:
        "Director with twenty years leading platform teams across mobile, cloud, and data programs. " +
        "Delivered measurable modernization outcomes in regulated financial services and healthcare environments.",
      skillsText: "Cloud: AWS, Kubernetes, Terraform, Docker",
      experience: [
        {
          id: "e0",
          title: "Director",
          company: "Co",
          location: "",
          startMonth: "Jan",
          startYear: "2020",
          endMonth: "",
          endYear: "Present",
          bullets: "Led platform modernization with 20% cost reduction.",
          hidden: false,
        },
      ],
    };

    const result = validateResume(form, "Director", { useRulesV2: true });
    const allIssues = [
      ...result.summary.issues,
      ...result.skills.issues,
      ...result.experience.issues,
    ];
    expect(allIssues.some((issue) => issue.code === EXTENDED_MODE_ATS_WARNING_CODE)).toBe(true);
    expect(result.experience.hasWarnings).toBe(true);
    expect(result.experience.hasErrors).toBe(false);
  });
});

describe("tailored preview metadata", () => {
  it("stores skillsText and resumeRulesVersion for ATS panel scoring", () => {
    const form = {
      ...emptyHubRefineryForm(),
      skillsText: "Mobile: Swift, Kotlin\nCloud: AWS, Kubernetes",
      pageLengthPreference: "2" as const,
    };

    const result = buildTailoredResumePreview(form, "Director", ["skills"], "2026-07-05T00:00:00.000Z", {
      resumeRulesVersion: 2,
    });

    expect(result.skillsText).toBe(form.skillsText);
    expect(result.resumeRulesVersion).toBe(2);
    expect(result.pageLengthPreference).toBe("2");
  });
});

describe("enhance brain v2 prompts", () => {
  it("includes page-mode-specific budget for 4+ extended", () => {
    const form = {
      ...emptyHubRefineryForm(),
      pageLengthPreference: "4+" as const,
      professionalSummary: "Summary text.",
      skillsText: "Skills: Go, Rust",
    };
    const ctx = buildCandidateContext({ form, targetRole: "Director" });
    const prompt = buildEnhanceSystemPromptV2(ctx);
    expect(prompt).toContain("4+ extended");
    expect(prompt).toContain("no content length limits");
  });

  it("includes tighter budget for page mode 1", () => {
    const form = {
      ...emptyHubRefineryForm(),
      pageLengthPreference: "1" as const,
      professionalSummary: "Summary text.",
      skillsText: "Skills: Go",
    };
    const ctx = buildCandidateContext({ form, targetRole: "Director" });
    const prompt = buildEnhanceSystemPromptV2(ctx);
    expect(prompt).toContain("1-page");
    expect(prompt).toContain("55–70 words");
  });
});

describe("runtime env overrides", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("respects NEXT_PUBLIC_RESUME_RULES_V2=true", () => {
    vi.stubEnv("NEXT_PUBLIC_RESUME_RULES_V2", "true");
    expect(isResumeRulesV2Enabled("4+", { featureEnabled: false })).toBe(true);
  });

  it("respects RESUME_RULES_V2_ENABLED=false", () => {
    vi.stubEnv("RESUME_RULES_V2_ENABLED", "false");
    const result = resolveResumeRulesV2ForPageMode("2", true);
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("env_disabled");
  });
});
