import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  countUniqueSkillTermsV2,
  parseSkillsCategoriesV2,
  validateSkillsV2,
} from "@/lib/resume/v2/skills-rules";
import {
  EXTENDED_MODE_ATS_WARNING,
  RESUME_RULES_V2_ONE_PAGE,
  RESUME_RULES_V2_TWO_PAGE,
} from "@/lib/resume/v2/rules-config";
import { validateResumeV2 } from "@/lib/resume/v2/validate-resume";
import { validateSummaryV2 } from "@/lib/resume/v2/summary-rules";
import { validateExperienceBulletsV2 } from "@/lib/resume/v2/bullet-rules";
import {
  isResumePageModeV2Implemented,
  normalizeResumePageModeV2,
} from "@/lib/resume/v2/page-mode";
import { buildDeepSeekPromptV2 } from "@/lib/resume/v2/prompt";
import { computeResumeReadinessV2, isV1BulletCapParseWarning } from "@/lib/resume/v2/resume-readiness-score";
import { repairResumeFormV2, countBulletQuantRateFromForm } from "@/lib/resume/v2/readiness-repair";
import {
  deriveJDIntelligenceForReadinessV2,
  filterKeywordGapForReadinessV2,
} from "@/lib/resume/v2/keyword-scoring";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";

describe("resume rules v2 page mode", () => {
  it("defaults unknown values to 2", () => {
    expect(normalizeResumePageModeV2("auto")).toBe("2");
    expect(normalizeResumePageModeV2(undefined)).toBe("2");
  });

  it("maps legacy page mode 4 to 4+", () => {
    expect(normalizeResumePageModeV2("4")).toBe("4+");
  });

  it("marks v2 page modes 1, 2, 3, 4+ as implemented", () => {
    expect(isResumePageModeV2Implemented("1")).toBe(true);
    expect(isResumePageModeV2Implemented("2")).toBe(true);
    expect(isResumePageModeV2Implemented("3")).toBe(true);
    expect(isResumePageModeV2Implemented("4+")).toBe(true);
  });
});

describe("skills v2", () => {
  it("parses category lines and counts unique terms", () => {
    const text = [
      "Data Architecture: Data Migration, Legacy Modernization, Event-Driven Architectures",
      "AI/ML: GitHub Copilot, Claude, Gemini, RAG, LLMs",
    ].join("\n");
    const categories = parseSkillsCategoriesV2(text);
    expect(categories).toHaveLength(2);
    expect(countUniqueSkillTermsV2(categories)).toBe(8);
  });

  it("warns when term count exceeds 75", () => {
    const terms = Array.from({ length: 76 }, (_, i) => `Skill ${i}`).join(", ");
    const result = validateSkillsV2(`Tools: ${terms}`, RESUME_RULES_V2_TWO_PAGE.skills);
    expect(result.warnings.some((w) => w.includes("76"))).toBe(true);
  });
});

describe("summary v2", () => {
  it("errors on 111+ words", () => {
    const words = Array.from({ length: 112 }, () => "word").join(" ");
    const result = validateSummaryV2(`${words}.`, RESUME_RULES_V2_TWO_PAGE.summary);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("bullets v2", () => {
  it("warns on recent role above warn threshold without hard cap", () => {
    const bullets = Array.from({ length: 9 }, (_, i) => `Delivered outcome ${i + 1} with 10% gain.`).join(
      "\n",
    );
    const result = validateExperienceBulletsV2(
      [{ title: "Director", bullets, hidden: false }],
      RESUME_RULES_V2_TWO_PAGE.bullets,
    );
    expect(result.warnings.some((w) => w.includes("9 bullets"))).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("prompt v2", () => {
  it("includes page mode 2 and category skills instructions", () => {
    const prompt = buildDeepSeekPromptV2({
      targetRole: "Director, AI/ML",
      resumeSourceText: "Sample resume",
      jobDescription: "Sample JD",
      mustWeaveKeywords: ["data architecture"],
    });
    expect(prompt).toContain("PAGE MODE: 2 pages");
    expect(prompt).toContain("max 75 unique terms");
    expect(prompt).toContain("NEVER use tables");
    expect(prompt).toContain("HARD CONSTRAINTS");
  });
});

const V2_FIXTURE: PrimeResumeData = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "555-0100",
  summary:
    "Director of engineering with fifteen years leading platform modernization and AI adoption. " +
    "Delivered multi-cloud data architecture programs across regulated financial services. " +
    "Partners with Legal, Risk, Compliance, and Cybersecurity on enterprise SDLC and prototyping initiatives.",
  skills: [],
  experience: [
    {
      title: "Director, Platform Engineering",
      company: "Fidelity",
      bullets: Array.from({ length: 9 }, (_, index) =>
        index % 2 === 0
          ? `Led platform initiative ${index + 1}, improving throughput by ${10 + index}%.`
          : `Partnered with stakeholders on architecture program ${index + 1}.`,
      ),
    },
    {
      title: "Senior Manager",
      company: "Prior Co",
      bullets: ["Managed team of 12.", "Reduced incidents 20%.", "Migrated legacy stack."],
    },
  ],
  education: [{ school: "MIT", degree: "BS Computer Science" }],
};

const V2_SKILLS_TEXT = [
  "Data Architecture: Data Migration, Legacy Modernization, Event-Driven Architectures, SDLC",
  "AI/ML: GitHub Copilot, Claude, Gemini, RAG, LLMs, Prototyping",
  "Cloud: AWS, Azure, Kubernetes, Terraform",
].join("\n");

const FIDELITY_JD_SNIPPET =
  "Director role requiring data architecture, SDLC, prototyping, Legal, Risk, Compliance, and Cybersecurity experience with AWS and Kubernetes.";

describe("computeResumeReadinessV2", () => {
  it("returns version 2 metadata for page mode 2", () => {
    const result = computeResumeReadinessV2(
      V2_FIXTURE,
      "Director, Platform Engineering",
      FIDELITY_JD_SNIPPET,
      { skillsText: V2_SKILLS_TEXT, pageMode: "2" },
    );
    expect(result.version).toBe(2);
    expect(result.pageMode).toBe("2");
    expect(result.implemented).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("pillars sum to total", () => {
    const result = computeResumeReadinessV2(
      V2_FIXTURE,
      "Director, Platform Engineering",
      FIDELITY_JD_SNIPPET,
      { skillsText: V2_SKILLS_TEXT },
    );
    const sum = Object.values(result.pillars).reduce((total, pillar) => total + pillar.score, 0);
    expect(sum).toBe(result.total);
  });

  it("does not treat nine recent bullets as v1 export violations", () => {
    const v1 = computeResumeReadiness(V2_FIXTURE, "Director, Platform Engineering", FIDELITY_JD_SNIPPET);
    const v2 = computeResumeReadinessV2(
      V2_FIXTURE,
      "Director, Platform Engineering",
      FIDELITY_JD_SNIPPET,
      { skillsText: V2_SKILLS_TEXT },
    );

    expect(v2.pillars.atsCompliance.details.some((detail) => detail.includes("RULES.md §8"))).toBe(
      false,
    );
    expect(v2.pillars.completeness.details.some((detail) => detail.includes("Too many skills"))).toBe(
      false,
    );
    expect(v2.pillars.atsCompliance.score).toBeGreaterThanOrEqual(v1.pillars.atsCompliance.score);
  });

  it("scores category skills without the v1 twenty-skill penalty", () => {
    const result = computeResumeReadinessV2(
      V2_FIXTURE,
      "Director, Platform Engineering",
      FIDELITY_JD_SNIPPET,
      { skillsText: V2_SKILLS_TEXT },
    );
    expect(result.pillars.completeness.details.some((detail) => detail.includes("20 or fewer"))).toBe(
      false,
    );
  });

  it("filters v1 bullet-cap parse warnings", () => {
    expect(isV1BulletCapParseWarning('"Role" has 9 bullets — only the first 6 export (RULES.md §8).')).toBe(
      true,
    );
    expect(isV1BulletCapParseWarning("Email missing — most ATS require it to create a candidate record.")).toBe(
      false,
    );
  });

  it("returns implemented readiness for 4+ with extended mode warning", () => {
    const result = computeResumeReadinessV2(V2_FIXTURE, "Director", FIDELITY_JD_SNIPPET, {
      pageMode: "4+",
      skillsText: V2_SKILLS_TEXT,
    });
    expect(result.implemented).toBe(true);
    expect(result.pageMode).toBe("4+");
    expect(result.total).toBeGreaterThan(0);
    expect(result.pillars.atsCompliance.details.some((detail) => detail.includes("4+ extended"))).toBe(
      true,
    );
  });

  it("uses tighter summary band for page mode 1", () => {
    const words = Array.from({ length: 72 }, () => "word").join(" ");
    const result = validateSummaryV2(`${words}.`, RESUME_RULES_V2_ONE_PAGE.summary, {
      modeLabel: RESUME_RULES_V2_ONE_PAGE.modeLabel,
    });
    expect(result.warnings.some((warning) => warning.includes("1-page"))).toBe(true);
  });

  it("emits extended mode ATS warning in validation", () => {
    const result = validateResumeV2(
      {
        firstName: "Jane",
        lastName: "Doe",
        cityState: "TX",
        phone: "555",
        email: "j@example.com",
        linkedIn: "",
        professionalSummary: "Director with platform leadership experience across cloud and data programs.",
        skillsText: V2_SKILLS_TEXT,
        experience: [],
        education: [],
        certifications: [],
        projects: [],
        languages: [],
        customSections: [],
        pageLengthPreference: "4+",
      },
      "4+",
    );
    expect(result.warnings.some((warning) => warning.message === EXTENDED_MODE_ATS_WARNING)).toBe(true);
  });
});

describe("keyword scoring v2", () => {
  it("derives JD intelligence from raw job description when cache is empty", () => {
    const jd = readFileSync(".tmp-debug/fidelity-mobile-arch-jd.txt", "utf8");
    const intel = deriveJDIntelligenceForReadinessV2(jd, "Director, Mobile Architecture", null);
    expect(intel).not.toBeNull();
    expect(intel!.tier1Keywords.length + intel!.tier2Keywords.length).toBeGreaterThan(0);
  });

  it("filters HR noise from raw keyword gap fallback", () => {
    const gap = {
      matched: [{ keyword: "angular", foundIn: ["skills"] as ("skills")[] }],
      missing: ["and/or", "full-time", "swift"],
      coveragePercent: 50,
      exactCoveragePercent: 50,
      topMissing: ["and/or", "full-time"],
      injectable: [],
      nonInjectable: [],
    };
    const filtered = filterKeywordGapForReadinessV2(gap);
    expect(filtered.missing.some((kw) => kw === "and/or")).toBe(false);
    expect(filtered.missing.some((kw) => kw === "full-time")).toBe(false);
  });
});

describe("repairResumeFormV2", () => {
  const sourceSummary =
    "Director with twenty years leading platform teams across mobile and cloud. " +
    "Delivered payment gateways, microservices migrations, and AI-assisted engineering workflows with measurable cost and velocity gains.";

  const sourceBullets = Array.from({ length: 10 }, (_, i) =>
    i % 2 === 0
      ? `Delivered platform initiative ${i + 1}, improving throughput by ${10 + i}%.`
      : `Partnered with product and design on mobile architecture program ${i + 1}.`,
  ).join("\n");

  const sourceForm = {
    firstName: "Jane",
    lastName: "Doe",
    cityState: "TX",
    phone: "555",
    email: "j@example.com",
    linkedIn: "",
    professionalSummary: sourceSummary,
    skillsText: "Mobile: Swift, Kotlin, Flutter",
    experience: [
      {
        id: "e0",
        title: "Director",
        company: "Co",
        location: "",
        startMonth: "Jan",
        startYear: "2024",
        endMonth: "",
        endYear: "Present",
        bullets: sourceBullets,
        hidden: false,
      },
    ],
    education: [{ id: "ed", degree: "BS", school: "State", location: "", startMonth: "", startYear: "", endMonth: "", endYear: "", hidden: false }],
    certifications: [],
    projects: [],
    languages: [],
    customSections: [],
    pageLengthPreference: "2" as const,
  };

  it("expands short summary, strips banned phrases, and selects tier bullets", () => {
    const enhanced = {
      ...sourceForm,
      professionalSummary: "Proven track record leader with mobile architecture expertise.",
      experience: [
        {
          ...sourceForm.experience[0]!,
          bullets: sourceBullets,
        },
      ],
    };

    const result = repairResumeFormV2({
      enhanced,
      source: sourceForm,
      targetRole: "Director, Mobile Architecture",
      pageMode: "2",
    });

    expect(result.repairs).toContain("summary_repaired");
    expect(result.repairs.some((r) => r.startsWith("bullets_tier_"))).toBe(true);
    expect(result.form.professionalSummary.toLowerCase()).not.toContain("proven track record");
    expect(result.form.professionalSummary.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(70);
    expect(result.form.experience[0]!.bullets.split("\n").filter(Boolean).length).toBeLessThanOrEqual(6);
  });

  it("raises quant rate by preferring metric bullets from source pool", () => {
    const enhanced = {
      ...sourceForm,
      experience: [
        {
          ...sourceForm.experience[0]!,
          bullets: sourceForm.experience[0]!.bullets,
        },
      ],
    };

    const beforeRate = countBulletQuantRateFromForm(enhanced);
    const repaired = repairResumeFormV2({
      enhanced,
      source: sourceForm,
      targetRole: "Director",
    }).form;
    const afterRate = countBulletQuantRateFromForm(repaired);

    expect(afterRate).toBeGreaterThanOrEqual(beforeRate);
    expect(afterRate).toBeGreaterThanOrEqual(0.5);
  });

  it("trims overcrowded skills categories", () => {
    const terms = Array.from({ length: 18 }, (_, i) => `Skill ${i}`).join(", ");
    const enhanced = {
      ...sourceForm,
      skillsText: `Mobile Architecture: ${terms}`,
    };
    const result = repairResumeFormV2({
      enhanced,
      source: sourceForm,
      targetRole: "Director",
    });
    expect(result.repairs).toContain("skills_trimmed");
    expect(result.form.skillsText.split(",").length).toBeLessThanOrEqual(15);
  });

  it("skips tier trimming in 4+ extended mode", () => {
    const result = repairResumeFormV2({
      enhanced: {
        ...sourceForm,
        experience: [{ ...sourceForm.experience[0]!, bullets: sourceBullets }],
      },
      source: sourceForm,
      targetRole: "Director",
      pageMode: "4+",
    });
    expect(result.repairs).toContain("extended_mode_no_trim");
    expect(result.form.experience[0]!.bullets.split("\n").filter(Boolean).length).toBe(10);
  });
});
