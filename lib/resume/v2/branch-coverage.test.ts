/**
 * Branch-focused coverage for Resume Rules V2 — exercises conditional paths
 * across validation, repair, readiness, keyword scoring, runtime, and wiring.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import * as atsParseSimulator from "@/lib/job-tracker/ats/ats-parse-simulator";
import { resolveResumeRulesV2Feature } from "@/lib/features/resolve-resume-rules-v2";
import {
  resumeLengthOptionsForRules,
  isV2PageModeValue,
} from "@/lib/resume/resume-length-select-options";
import {
  validateResumeWithRulesV2,
  emptyHeaderSection,
} from "@/lib/resume/validation/validate-resume-v2-bridge";
import {
  collectResumeValidationMessagesV2,
  validateResumeV2,
} from "@/lib/resume/v2/validate-resume";
import * as validateResumeModule from "@/lib/resume/v2/validate-resume";
import {
  RESUME_RULES_V2_EXTENDED,
  RESUME_RULES_V2_TWO_PAGE,
  isUnlimitedResumeRulesProfileV2,
  resolveResumeRulesProfileV2,
} from "@/lib/resume/v2/rules-config";
import * as rulesConfig from "@/lib/resume/v2/rules-config";
import {
  countExperienceBulletsV2,
  getExperienceRecencyTierV2,
  parseExperienceBulletsV2,
  validateExperienceBulletsV2,
} from "@/lib/resume/v2/bullet-rules";
import * as bulletRules from "@/lib/resume/v2/bullet-rules";
import {
  buildExperienceBlobFromPrime,
  deriveJDIntelligenceForReadinessV2,
  filterKeywordGapForReadinessV2,
  resolveKeywordGapForReadinessV2,
} from "@/lib/resume/v2/keyword-scoring";
import { buildDeepSeekPromptV2 } from "@/lib/resume/v2/prompt";
import { repairResumeFormV2 } from "@/lib/resume/v2/readiness-repair";
import { computeResumeReadinessV2, computeResumeReadinessV2FromForm, countSkillTermsFromTextV2, getReadinessRecencyTierV2 } from "@/lib/resume/v2/resume-readiness-score";
import {
  isResumeRulesV2Enabled,
  normalizeActiveResumePageMode,
  resolveResumeRulesV2ForPageMode,
} from "@/lib/resume/v2/runtime";
import { parseSkillsCategoriesV2, validateSkillsV2 } from "@/lib/resume/v2/skills-rules";
import { validateSummaryV2 } from "@/lib/resume/v2/summary-rules";

const PAGE_MODES = ["1", "2", "3", "4+"] as const;

function minimalHubForm(overrides: Partial<ReturnType<typeof emptyHubRefineryForm>> = {}) {
  return {
    ...emptyHubRefineryForm(),
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "555-0100",
    cityState: "Austin, TX",
    professionalSummary:
      "Director with twenty years leading platform teams across cloud, data, and mobile programs. " +
      "Delivered measurable modernization outcomes in regulated financial services environments.",
    skillsText: "Cloud: AWS, Kubernetes, Terraform\nData: SQL, Spark, Kafka",
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
        bullets: "- Led platform modernization with 20% cost reduction.\n- Migrated legacy stack to Kubernetes.",
        hidden: false,
      },
    ],
    pageLengthPreference: "2" as const,
    ...overrides,
  };
}

function minimalPrime(overrides: Partial<PrimeResumeData> = {}): PrimeResumeData {
  return {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "555-0100",
    summary:
      "Director with twenty years leading platform teams across cloud, data, and mobile programs. " +
      "Delivered measurable modernization outcomes in regulated financial services environments.",
    skills: ["AWS", "Kubernetes"],
    experience: [
      {
        title: "Director",
        company: "Co",
        bullets: [
          "Led platform modernization with 20% cost reduction.",
          "Migrated legacy stack to Kubernetes.",
          "Reduced incidents 15% through SRE practices.",
          "Partnered with Legal and Compliance on SDLC.",
          "Delivered API gateway serving 2M requests daily.",
        ],
      },
    ],
    education: [{ school: "State U", degree: "BS CS" }],
    ...overrides,
  };
}

const MOCK_JD_INTEL: JDIntelligence = {
  extractedJobTitle: "Director, Platform Engineering",
  mustHaveSkills: ["kubernetes"],
  mustHaveYearsExp: 10,
  mustHaveDegree: null,
  mustHaveCerts: [],
  preferredSkills: [],
  preferredDomain: [],
  seniority: "director",
  scope: "enterprise",
  domain: "technology",
  industryDomain: [],
  tier1Keywords: ["kubernetes", "aws", "terraform"],
  tier2Keywords: ["platform", "modernization"],
  tier3Keywords: ["agile"],
  summaryTheme: "platform leadership",
  targetVerbs: ["led", "delivered"],
  deliverables: [],
  impactDimensions: [],
  emphasisAreas: [],
  deprioritize: [],
  velocitySignal: null,
  ownershipLevel: null,
  source: "deterministic",
  confidence: 0.9,
  extractedAt: "2026-07-05T00:00:00.000Z",
};

describe("v2 branch coverage — runtime", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["RESUME_RULES_V2_ENABLED", "true", true],
    ["NEXT_PUBLIC_RESUME_RULES_V2", "true", true],
    ["RESUME_RULES_V2_ENABLED", "false", false],
    ["NEXT_PUBLIC_RESUME_RULES_V2", "false", false],
  ] as const)("env %s=%s resolves enabled=%s", (key, value, enabled) => {
    vi.stubEnv(key, value);
    const result = resolveResumeRulesV2ForPageMode("2", false);
    expect(result.enabled).toBe(enabled);
    if (!enabled) {
      expect(result.reason).toBe("env_disabled");
    }
  });

  it("normalizeActiveResumePageMode maps legacy 4 to 4+", () => {
    expect(normalizeActiveResumePageMode("4")).toBe("4+");
    expect(normalizeActiveResumePageMode(undefined)).toBe("2");
  });

  it("isResumeRulesV2Enabled is false without feature flag or env", () => {
    expect(isResumeRulesV2Enabled("2")).toBe(false);
    expect(isResumeRulesV2Enabled("2", { featureEnabled: true })).toBe(true);
  });
});

describe("v2 branch coverage — rules profiles", () => {
  it.each(PAGE_MODES)("resolveResumeRulesProfileV2(%s) returns profile", (mode) => {
    const profile = resolveResumeRulesProfileV2(mode);
    expect(profile?.pageMode).toBe(mode);
    if (mode === "4+") {
      expect(profile?.unlimitedContent).toBe(true);
    } else {
      expect(profile?.unlimitedContent).toBeUndefined();
    }
  });
});

describe("v2 branch coverage — summary rules", () => {
  it("errors on word count above errorWordsFrom", () => {
    const words = Array.from({ length: 112 }, () => "word").join(" ");
    const result = validateSummaryV2(`${words}.`, RESUME_RULES_V2_TWO_PAGE.summary);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("warns in warn word band", () => {
    const words = Array.from({ length: 100 }, () => "word").join(" ");
    const result = validateSummaryV2(`${words}.`, RESUME_RULES_V2_TWO_PAGE.summary);
    expect(result.warnings.some((w) => w.includes("words"))).toBe(true);
  });

  it("warns when sentence count hits warnSentencesFrom", () => {
    const text = "One. Two. Three. Four. Five.";
    const result = validateSummaryV2(text, RESUME_RULES_V2_TWO_PAGE.summary);
    expect(result.warnings.some((w) => w.includes("5 sentences"))).toBe(true);
  });

  it("4+ unlimitedContent only warns on short summary", () => {
    const result = validateSummaryV2("Too short.", RESUME_RULES_V2_EXTENDED.summary, {
      unlimitedContent: true,
      modeLabel: "4+ extended",
    });
    expect(result.warnings.some((w) => w.includes("consider at least"))).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("flags banned summary phrases", () => {
    const result = validateSummaryV2(
      "Proven track record leader with platform expertise across cloud programs.",
      RESUME_RULES_V2_TWO_PAGE.summary,
    );
    expect(result.bannedWords.length).toBeGreaterThan(0);
  });
});

describe("v2 branch coverage — skills rules", () => {
  it("errors on table syntax in skills", () => {
    const result = validateSkillsV2("| Skill | Level |", RESUME_RULES_V2_TWO_PAGE.skills);
    expect(result.errors.some((e) => e.includes("tables"))).toBe(true);
  });

  it("parses markdown category lines and uncategorized terms", () => {
    const categories = parseSkillsCategoriesV2("- **Cloud:** AWS, GCP\nPlainTerm");
    expect(categories.some((c) => c.label === "Cloud")).toBe(true);
    expect(categories.some((c) => c.label === "Skills" && c.terms.includes("PlainTerm"))).toBe(true);
  });

  it("warns on too many category lines and per-category terms", () => {
    const lines = Array.from({ length: 6 }, (_, i) => `Cat ${i}: a, b, c`).join("\n");
    const result = validateSkillsV2(lines, RESUME_RULES_V2_TWO_PAGE.skills);
    expect(result.warnings.some((w) => w.includes("category lines"))).toBe(true);

    const bigCategory = `Tools: ${Array.from({ length: 16 }, (_, i) => `Skill${i}`).join(", ")}`;
    const bigResult = validateSkillsV2(bigCategory, RESUME_RULES_V2_TWO_PAGE.skills);
    expect(bigResult.warnings.some((w) => w.includes("soft max"))).toBe(true);
  });

  it("4+ unlimitedContent skips term-count limits", () => {
    const terms = Array.from({ length: 80 }, (_, i) => `Skill${i}`).join(", ");
    const result = validateSkillsV2(`All: ${terms}`, RESUME_RULES_V2_EXTENDED.skills, {
      unlimitedContent: true,
    });
    expect(result.warnings.some((w) => w.includes("max"))).toBe(false);
  });
});

describe("v2 branch coverage — bullet rules", () => {
  it("assigns recency tiers by visible index", () => {
    expect(getExperienceRecencyTierV2(0)).toBe("recent");
    expect(getExperienceRecencyTierV2(1)).toBe("mid");
    expect(getExperienceRecencyTierV2(2)).toBe("older");
  });

  it("returns zero bullets for empty input", () => {
    expect(countExperienceBulletsV2("")).toBe(0);
    expect(parseExperienceBulletsV2(null)).toEqual([]);
  });

  it("warns on mid-tier below target and long bullets", () => {
    const longBullet = `Led ${"enterprise ".repeat(40)}platform program with measurable outcomes.`;
    const entries = [
      {
        title: "Director",
        bullets: `- Bullet one.\n- Bullet two.\n- Bullet three.\n- Bullet four.\n- Bullet five.\n- ${longBullet}`,
        hidden: false,
      },
      { title: "Manager", bullets: "- Only one bullet.", hidden: false },
      { title: "Hidden", bullets: "- Skip me.", hidden: true },
    ];
    const result = validateExperienceBulletsV2(entries, RESUME_RULES_V2_TWO_PAGE.bullets);
    expect(result.warnings.some((w) => w.includes("mid role"))).toBe(true);
    expect(result.longLineIssues.length).toBeGreaterThan(0);
  });

  it("4+ unlimitedContent skips bullet count warnings", () => {
    const bullets = Array.from({ length: 12 }, (_, i) => `Outcome ${i + 1} with 10% gain.`).join("\n");
    const result = validateExperienceBulletsV2(
      [{ title: "Director", bullets, hidden: false }],
      RESUME_RULES_V2_EXTENDED.bullets,
      { unlimitedContent: true },
    );
    expect(result.countIssues).toHaveLength(0);
  });
});

describe("v2 branch coverage — validate resume", () => {
  it("detects table violations in skills and custom sections", () => {
    const form = minimalHubForm({
      skillsText: "| AWS | Expert |",
      customSections: [
        { id: "c1", title: "Projects", content: "| Name | Tech |", hidden: false },
        { id: "c2", title: "Hidden", content: "| x | y |", hidden: true },
      ],
    });
    const result = validateResumeV2(form, "2");
    expect(result.errors.some((e) => e.code === "skills_table")).toBe(true);
    expect(result.errors.some((e) => e.code === "custom_section_table")).toBe(true);
    expect(result.errors.some((e) => e.message.includes("Hidden"))).toBe(false);
  });

  it("collectResumeValidationMessagesV2 maps warnings and errors", () => {
    const result = validateResumeV2(
      minimalHubForm({ skillsText: "| bad | table |" }),
      "2",
    );
    const messages = collectResumeValidationMessagesV2(result);
    expect(messages.errors.length).toBeGreaterThan(0);
  });

  it.each(PAGE_MODES)("validates each page mode %s", (mode) => {
    const result = validateResumeV2(minimalHubForm({ pageLengthPreference: mode }), mode);
    expect(result.pageMode).toBe(mode);
    expect(result.implemented).toBe(true);
    if (mode === "4+") {
      expect(result.warnings.some((w) => w.code === "extended_mode_ats_risk")).toBe(true);
    }
  });

  it("returns not-implemented warning when profile is missing", () => {
    vi.spyOn(rulesConfig, "resolveResumeRulesProfileV2").mockReturnValueOnce(null);
    const result = validateResumeV2(minimalHubForm(), "2");
    expect(result.profile).toBeNull();
    expect(result.warnings.some((w) => w.code === "page_mode_not_implemented")).toBe(true);
    expect(result.errors).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it("propagates summary and skills validation errors", () => {
    const words = Array.from({ length: 112 }, () => "word").join(" ");
    const result = validateResumeV2(
      minimalHubForm({
        professionalSummary: `${words}.`,
        skillsText: "| Skill | Level |",
      }),
      "2",
    );
    expect(result.errors.some((e) => e.section === "summary")).toBe(true);
    expect(result.errors.some((e) => e.code === "skills_table")).toBe(true);
  });

  it("propagates experience bullet validation errors", () => {
    vi.spyOn(bulletRules, "validateExperienceBulletsV2").mockReturnValueOnce({
      countIssues: [],
      longLineIssues: [],
      warnings: [],
      errors: ["Experience bullets failed validation."],
    });
    const result = validateResumeV2(minimalHubForm(), "2");
    expect(result.errors.some((e) => e.section === "experience")).toBe(true);
    vi.restoreAllMocks();
  });
});

describe("v2 branch coverage — studio validation bridge", () => {
  it("blocks finalize when header has errors", () => {
    const header = {
      issues: [{ field: "email", code: "missing", severity: "error" as const, message: "Email required." }],
      hasErrors: true,
      hasWarnings: false,
    };
    const result = validateResumeWithRulesV2(
      minimalHubForm(),
      header,
      emptyHeaderSection(),
      emptyHeaderSection(),
    );
    expect(result.canFinalize).toBe(false);
  });

  it("allows finalize for compliant form with only 4+ warning", () => {
    const result = validateResumeWithRulesV2(
      minimalHubForm({ pageLengthPreference: "4+" }),
      emptyHeaderSection(),
      emptyHeaderSection(),
      emptyHeaderSection(),
    );
    expect(result.canFinalize).toBe(true);
    expect(result.experience.hasWarnings).toBe(true);
  });
});

describe("v2 branch coverage — keyword scoring", () => {
  it("returns cached intelligence without re-deriving", () => {
    const cached = deriveJDIntelligenceForReadinessV2("", "Director", MOCK_JD_INTEL);
    expect(cached).toBe(MOCK_JD_INTEL);
  });

  it("returns null for empty job description", () => {
    expect(deriveJDIntelligenceForReadinessV2("   ", "Director", null)).toBeNull();
  });

  it("uses intelligence path without filtering when keywords present", () => {
    const data = minimalPrime();
    const gap = resolveKeywordGapForReadinessV2(
      data,
      "Director",
      "Requires kubernetes aws terraform platform modernization agile",
      MOCK_JD_INTEL,
    );
    expect(gap.matched.length + gap.missing.length).toBeGreaterThan(0);
  });

  it("filterKeywordGapForReadinessV2 preserves coverage when total is zero", () => {
    const gap = {
      matched: [],
      missing: [],
      coveragePercent: 42,
      exactCoveragePercent: 42,
      topMissing: [],
      injectable: [],
      nonInjectable: [],
    };
    const filtered = filterKeywordGapForReadinessV2(gap);
    expect(filtered.coveragePercent).toBe(42);
  });

  it("buildExperienceBlobFromPrime joins experience text", () => {
    const blob = buildExperienceBlobFromPrime(minimalPrime());
    expect(blob).toContain("Director");
    expect(blob).toContain("20%");
  });

  it("returns null when derived intelligence has no keywords", () => {
    expect(deriveJDIntelligenceForReadinessV2("the and or of", "Director", null)).toBeNull();
  });

  it("uses cached intelligence without filtering gap", () => {
    const gap = resolveKeywordGapForReadinessV2(
      minimalPrime({ skills: ["kubernetes", "aws"] }),
      "Director",
      "Requires kubernetes and aws.",
      MOCK_JD_INTEL,
      { experienceBlob: "Director kubernetes aws terraform" },
    );
    expect(gap.matched.length + gap.missing.length).toBeGreaterThan(0);
  });
});

describe("v2 branch coverage — readiness repair", () => {
  const sourceForm = minimalHubForm({
    professionalSummary:
      "Director with twenty years leading platform teams across cloud and data programs. " +
      "Delivered modernization outcomes with measurable cost and velocity gains across enterprise environments.",
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
        bullets: Array.from({ length: 8 }, (_, i) =>
          i % 2 === 0
            ? `Delivered platform initiative ${i + 1}, improving throughput by ${10 + i}%.`
            : `Partnered with stakeholders on architecture program ${i + 1}.`,
        ).join("\n"),
        hidden: false,
      },
    ],
  });

  it.each(["1", "3"] as const)("repairs summary and bullets for page mode %s", (mode) => {
    const result = repairResumeFormV2({
      enhanced: {
        ...sourceForm,
        professionalSummary: "Proven track record leader.",
        pageLengthPreference: mode,
      },
      source: sourceForm,
      targetRole: "Director",
      pageMode: mode,
    });
    expect(result.pageMode).toBe(mode);
    expect(result.repairs.length).toBeGreaterThan(0);
    expect(result.form.professionalSummary.toLowerCase()).not.toContain("proven track record");
  });

  it("merges overcrowded skill categories during repair", () => {
    const lines = Array.from({ length: 7 }, (_, i) => `Category ${i}: a, b, c, d, e`).join("\n");
    const result = repairResumeFormV2({
      enhanced: { ...sourceForm, skillsText: lines },
      source: sourceForm,
      targetRole: "Director",
      pageMode: "2",
    });
    expect(result.repairs).toContain("skills_trimmed");
  });

  it("4+ strips banned phrases only", () => {
    const result = repairResumeFormV2({
      enhanced: {
        ...sourceForm,
        professionalSummary: "Passionate synergy-driven leader with proven track record.",
      },
      source: sourceForm,
      targetRole: "Director",
      pageMode: "4+",
    });
    expect(result.repairs).toContain("extended_mode_no_trim");
    expect(result.repairs).toContain("summary_banned_phrases_stripped");
  });

  it("trims excess summary sentences without expanding from source", () => {
    const fiveSentences = [
      "Led platform teams across cloud and data programs with executive stakeholders and portfolio accountability.",
      "Delivered modernization outcomes with measurable cost, velocity, and reliability gains across enterprise environments.",
      "Partnered with security, legal, and compliance teams on enterprise SDLC and architecture review practices.",
      "Scaled API platforms and data services for regulated financial services workloads across multiple regions.",
      "Drove multi-cloud architecture standards, tooling, and engineering practices across global platform teams.",
    ].join(" ");
    const result = repairResumeFormV2({
      enhanced: { ...sourceForm, professionalSummary: fiveSentences },
      source: { ...sourceForm, professionalSummary: "", experience: [] },
      targetRole: "Director",
      pageMode: "2",
    });
    expect(result.repairs).toContain("summary_repaired");
    expect(
      validateSummaryV2(result.form.professionalSummary, RESUME_RULES_V2_TWO_PAGE.summary).sentenceCount,
    ).toBeLessThanOrEqual(4);
    expect(
      validateSummaryV2(result.form.professionalSummary, RESUME_RULES_V2_TWO_PAGE.summary).sentenceCount,
    ).toBeLessThan(5);
  });

  it("truncates a single overlong summary sentence", () => {
    const words = Array.from({ length: 112 }, () => "word").join(" ");
    const result = repairResumeFormV2({
      enhanced: { ...sourceForm, professionalSummary: `${words}.` },
      source: sourceForm,
      targetRole: "Director",
      pageMode: "2",
    });
    expect(result.repairs).toContain("summary_repaired");
    expect(result.form.professionalSummary.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(90);
  });

  it("expands short summary from source sentences and bullet support", () => {
    const bulletSupportSource = minimalHubForm({
      professionalSummary:
        "Director with twenty years leading platform teams across cloud and data programs. " +
        "Delivered modernization outcomes with measurable cost and velocity gains across enterprise environments.",
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
          bullets: [
            "Delivered 20% cost reduction.",
            "Reduced incidents 15%.",
            "Improved throughput 10%.",
            "Scaled platform to 2M requests.",
            "Cut release time 40%.",
          ].join("\n"),
          hidden: false,
        },
        {
          id: "e1",
          title: "Hidden",
          company: "Old",
          location: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
          bullets: "Should not appear in summary support.",
          hidden: true,
        },
      ],
    });

    const result = repairResumeFormV2({
      enhanced: { ...bulletSupportSource, professionalSummary: "Leader." },
      source: bulletSupportSource,
      targetRole: "Director",
      pageMode: "2",
    });

    expect(result.repairs).toContain("summary_repaired");
    const wordCount = validateSummaryV2(
      result.form.professionalSummary,
      RESUME_RULES_V2_TWO_PAGE.summary,
    ).wordCount;
    expect(wordCount).toBeGreaterThan(1);
    expect(result.form.professionalSummary.toLowerCase()).not.toContain("should not appear");
  });

  it("prefers metric bullets when quant rate is low", () => {
    const weak = [
      "Responsible for team coordination and stakeholder updates.",
      "Worked on platform improvements across the organization.",
      "Helped with migration planning activities.",
      "Supported architecture reviews with partners.",
      "Assisted with documentation efforts.",
    ].join("\n");
    const metric = [
      "Delivered platform migration with 20% cost reduction.",
      "Reduced incidents 15% through SRE practices.",
      "Improved API latency 30% via caching layer.",
      "Scaled services to 2M daily requests.",
      "Cut release cycle time 40% with CI/CD automation.",
    ].join("\n");

    const before = repairResumeFormV2({
      enhanced: { ...sourceForm, experience: [{ ...sourceForm.experience[0]!, bullets: weak }] },
      source: { ...sourceForm, experience: [{ ...sourceForm.experience[0]!, bullets: metric }] },
      targetRole: "Director",
      pageMode: "2",
    }).form;

    const beforeRate =
      before.experience[0]!.bullets.split("\n").filter((line) => /\d/.test(line)).length /
      before.experience[0]!.bullets.split("\n").filter(Boolean).length;

    const after = repairResumeFormV2({
      enhanced: { ...sourceForm, experience: [{ ...sourceForm.experience[0]!, bullets: weak }] },
      source: { ...sourceForm, experience: [{ ...sourceForm.experience[0]!, bullets: metric }] },
      targetRole: "Director",
      pageMode: "2",
    }).form;

    const afterRate =
      after.experience[0]!.bullets.split("\n").filter((line) => /\d/.test(line)).length /
      after.experience[0]!.bullets.split("\n").filter(Boolean).length;

    expect(afterRate).toBeGreaterThanOrEqual(beforeRate);
    expect(afterRate).toBeGreaterThanOrEqual(0.5);
  });

  it("dedupes skills at maxUniqueTerms and skips empty skills", () => {
    const dupTerms = Array.from({ length: 80 }, (_, i) => `Skill${i}`).join(", ");
    const dupResult = repairResumeFormV2({
      enhanced: { ...sourceForm, skillsText: `Cloud: ${dupTerms}\nData: Skill0, Skill1, Skill2` },
      source: sourceForm,
      targetRole: "Director",
      pageMode: "2",
    });
    expect(dupResult.repairs).toContain("skills_trimmed");

    const emptySkills = repairResumeFormV2({
      enhanced: { ...sourceForm, skillsText: "" },
      source: sourceForm,
      targetRole: "Director",
      pageMode: "2",
    });
    expect(emptySkills.repairs).not.toContain("skills_trimmed");
  });

  it("returns page_mode_not_implemented when profile is missing", () => {
    vi.spyOn(rulesConfig, "resolveResumeRulesProfileV2").mockReturnValueOnce(null);
    const result = repairResumeFormV2({
      enhanced: minimalHubForm(),
      source: minimalHubForm(),
      targetRole: "Director",
    });
    expect(result.repairs).toContain("page_mode_not_implemented");
    expect(result.profile).toBeNull();
    vi.restoreAllMocks();
  });

  it("trims summary word count by dropping sentences over the mode budget", () => {
    const sentence = (tag: string) =>
      Array.from({ length: 25 }, (_, i) => `${tag}word${i}`).join(" ") + ".";
    const overBudgetSummary = [sentence("a"), sentence("b"), sentence("c"), sentence("d")].join(" ");
    const result = repairResumeFormV2({
      enhanced: { ...sourceForm, professionalSummary: overBudgetSummary },
      source: { ...sourceForm, professionalSummary: "", experience: [] },
      targetRole: "Director",
      pageMode: "2",
    });
    expect(result.repairs).toContain("summary_repaired");
    expect(
      validateSummaryV2(result.form.professionalSummary, RESUME_RULES_V2_TWO_PAGE.summary).wordCount,
    ).toBeLessThanOrEqual(90);
  });

  it("merges source summary when trimmed output is still below the word minimum", () => {
    const shortSentence = (tag: string) =>
      Array.from({ length: 15 }, (_, i) => `${tag}term${i}`).join(" ") + ".";
    const enhancedSummary = [
      shortSentence("a"),
      shortSentence("b"),
      shortSentence("c"),
      shortSentence("d"),
    ].join(" ");
    const sourceSummary = shortSentence("source");
    const result = repairResumeFormV2({
      enhanced: { ...sourceForm, professionalSummary: enhancedSummary },
      source: { ...sourceForm, professionalSummary: sourceSummary, experience: [] },
      targetRole: "Director",
      pageMode: "2",
    });
    expect(result.repairs).toContain("summary_repaired");
    expect(result.form.professionalSummary.toLowerCase()).toContain("sourceterm");
  });

  it("splits overlong bullets during the final length enforcement pass", () => {
    // A strong-opening, metric-bearing bullet the tier selector will keep, whose two
    // sentences each exceed the ATS char cap so length enforcement must split it.
    const clause = (verb: string) =>
      `${verb} platform modernization delivering 20% cost reduction ` +
      Array.from({ length: 40 }, (_, i) => `across-initiative-${i}`).join(" ");
    const longBullet = `${clause("Delivered")}. ${clause("Optimized")}.`;
    const result = repairResumeFormV2({
      enhanced: {
        ...sourceForm,
        experience: [{ ...sourceForm.experience[0]!, bullets: longBullet }],
      },
      source: { ...sourceForm, experience: [{ ...sourceForm.experience[0]!, bullets: longBullet }] },
      targetRole: "Director",
      pageMode: "2",
    });
    expect(result.repairs).toContain("bullet_length_enforced");
    const lines = result.form.experience[0]!.bullets.split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines.every((line) => line.length <= 201)).toBe(true);
  });

  it("swaps in metric bullets when quant rate is below target", () => {
    const weak = [
      "Responsible for coordinating stakeholder meetings and weekly status updates.",
      "Worked on platform improvements and documentation across the organization.",
      "Helped with migration planning and architecture review support activities.",
      "Supported cross-functional delivery and process improvement initiatives.",
      "Assisted with vendor evaluations and technical assessment documentation.",
      "Participated in roadmap planning and quarterly business review preparation.",
    ].join("\n");
    const metric = [
      "Delivered platform migration with 20% cost reduction across three regions.",
      "Reduced incidents 15% through SRE practices and automated monitoring.",
      "Improved API latency 30% via caching layer and query optimization.",
      "Scaled services to 2M daily requests with 99.9% availability.",
      "Cut release cycle time 40% with CI/CD automation and test coverage.",
      "Saved $1.2M annually through infrastructure rightsizing and reserved capacity.",
    ].join("\n");

    const result = repairResumeFormV2({
      enhanced: { ...sourceForm, experience: [{ ...sourceForm.experience[0]!, bullets: weak }] },
      source: { ...sourceForm, experience: [{ ...sourceForm.experience[0]!, bullets: metric }] },
      targetRole: "Director",
      pageMode: "1",
    });

    const bullets = result.form.experience[0]!.bullets.split("\n").filter(Boolean);
    const quantCount = bullets.filter((line) => /\d/.test(line)).length;
    expect(quantCount).toBeGreaterThanOrEqual(Math.ceil(bullets.length * 0.7));
  });
});

describe("v2 branch coverage — readiness score", () => {
  const jd =
    "Director role requiring kubernetes, aws, terraform, platform modernization, and agile delivery.";

  it("uses comma skills fallback when skillsText omitted", () => {
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, { pageMode: "2" });
    expect(result.pillars.keywords.score).toBeGreaterThan(0);
  });

  it("returns zero keyword pillar without job description", () => {
    const result = computeResumeReadinessV2(minimalPrime(), "Director", "", { pageMode: "2" });
    expect(result.pillars.keywords.score).toBe(0);
    expect(result.pillars.keywords.details[0]).toContain("No job description");
  });

  it("penalizes missing contact fields and empty summary", () => {
    const result = computeResumeReadinessV2(
      {
        ...minimalPrime(),
        fullName: "",
        email: "",
        phone: "",
        summary: "",
        experience: [],
        education: [],
      },
      "Director",
      jd,
      { pageMode: "2" },
    );
    expect(result.pillars.completeness.score).toBeLessThan(15);
    expect(result.pillars.completeness.details.some((d) => d.includes("full name"))).toBe(true);
    expect(result.pillars.completeness.details.some((d) => d.includes("Professional Summary"))).toBe(
      true,
    );
  });

  it("scores platform-specific ATS compliance", () => {
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, {
      pageMode: "2",
      platform: "workday",
    });
    expect(result.pillars.atsCompliance.label).toBe("ATS Compliance");
  });

  it("assigns letter grade from total score", () => {
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, {
      pageMode: "2",
      skillsText: "Cloud: AWS, Kubernetes, Terraform",
    });
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
    expect(result.topActions.length).toBeLessThanOrEqual(6);
  });

  it("warns when recent role has too few bullets in mode 2", () => {
    const result = computeResumeReadinessV2(
      minimalPrime({
        experience: [{ title: "Director", company: "Co", bullets: ["Single bullet only."] }],
      }),
      "Director",
      jd,
      { pageMode: "2" },
    );
    expect(
      result.pillars.bulletQuality.details.some((d) => d.includes("Most recent role has 1 bullet")),
    ).toBe(true);
  });

  it("flags generic banned skills in completeness", () => {
    const result = computeResumeReadinessV2(
      minimalPrime(),
      "Director",
      jd,
      {
        pageMode: "2",
        skillsText: "Soft Skills: teamwork, communication, leadership, problem solving, detail oriented, go getter",
      },
    );
    expect(
      result.pillars.completeness.details.some((d) => d.includes("generic terms")),
    ).toBe(true);
  });

  it.each(PAGE_MODES)("computes readiness for page mode %s", (mode) => {
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, {
      pageMode: mode,
      skillsText: "Cloud: AWS, Kubernetes, Terraform",
    });
    expect(result.pageMode).toBe(mode);
    expect(result.version).toBe(2);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it("reports low and moderate keyword coverage bands", () => {
    const unrelatedJd =
      "Requires COBOL, JCL, z/OS mainframe, CICS, IMS DB, assembler, and tape library operations.";
    const low = computeResumeReadinessV2(
      minimalPrime({ skills: ["javascript", "react"] }),
      "Director",
      unrelatedJd,
      { pageMode: "2", skillsText: "Web: javascript, react" },
    );
    expect(
      low.pillars.keywords.details.some(
        (d) =>
          d.includes("Low keyword coverage") ||
          d.includes("Missing keywords") ||
          d.includes("Tailor your resume"),
      ),
    ).toBe(true);

    const moderate = computeResumeReadinessV2(
      minimalPrime({ skills: ["kubernetes", "aws", "terraform", "platform"] }),
      "Director",
      "Requires kubernetes, aws, terraform, platform, agile, legal, compliance, cybersecurity, prototyping.",
      { pageMode: "2", skillsText: "Cloud: kubernetes, aws, terraform, platform" },
    );
    expect(
      moderate.pillars.keywords.details.some((d) => d.toLowerCase().includes("coverage")),
    ).toBe(true);
  });

  it("surfaces summary validation errors in ATS compliance", () => {
    const words = Array.from({ length: 112 }, () => "word").join(" ");
    const result = computeResumeReadinessV2(
      minimalPrime({ summary: `${words}.` }),
      "Director",
      jd,
      { pageMode: "2", skillsText: "Cloud: AWS" },
    );
    expect(result.pillars.atsCompliance.details.some((d) => d.includes("words"))).toBe(true);
  });

  it("returns clean ATS compliance when the form passes all v2 checks", () => {
    vi.spyOn(atsParseSimulator, "simulateAtsParse").mockReturnValue({
      sections: [],
      totalChars: 1200,
      warnings: [],
    });
    vi.spyOn(validateResumeModule, "validateResumeV2").mockReturnValue({
      version: 2,
      pageMode: "2",
      profile: RESUME_RULES_V2_TWO_PAGE,
      implemented: true,
      warnings: [],
      errors: [],
    });
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, { pageMode: "2" });
    expect(result.pillars.atsCompliance.details).toContain(
      "No parser warnings detected under RULES v2. ✓",
    );
    vi.restoreAllMocks();
  });

  it("flags empty skills in completeness scoring", () => {
    const result = computeResumeReadinessV2(minimalPrime({ skills: [] }), "Director", jd, {
      pageMode: "2",
      skillsText: "",
    });
    expect(result.pillars.completeness.details).toContain(
      "Add skills — the Skills section is heavily weighted.",
    );
  });

  it("deducts completeness for skills validation errors", () => {
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, {
      pageMode: "2",
      skillsText: "| Skill | Level |",
    });
    expect(result.pillars.completeness.details.some((d) => d.includes("table"))).toBe(true);
  });

  it("suggests expanding skills in extended mode when term count is moderate", () => {
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, {
      pageMode: "4+",
      skillsText: "Cloud: AWS, Kubernetes, Terraform, Docker, Helm, Spark",
    });
    expect(
      result.pillars.completeness.details.some((d) => d.includes("10+ unique skill terms")),
    ).toBe(true);
  });

  it("includes extended-mode ATS risk in compliance for 4+", () => {
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, {
      pageMode: "4+",
      skillsText: "Cloud: AWS, Kubernetes",
    });
    expect(
      result.pillars.atsCompliance.details.some((d) => d.includes("Page mode 4+ extended")),
    ).toBe(true);
  });

  it("returns zero score when page mode profile is missing", () => {
    vi.spyOn(rulesConfig, "resolveResumeRulesProfileV2").mockReturnValueOnce(null);
    const result = computeResumeReadinessV2(minimalPrime(), "Director", jd, { pageMode: "2" });
    expect(result.total).toBe(0);
    expect(result.grade).toBe("F");
    expect(result.pillars.completeness.details[0]).toContain("not implemented");
    vi.restoreAllMocks();
  });

  it("computes readiness from hub form via computeResumeReadinessV2FromForm", () => {
    const result = computeResumeReadinessV2FromForm(minimalHubForm(), "Director", jd, {
      pageMode: "2",
    });
    expect(result.version).toBe(2);
    expect(result.pageMode).toBe("2");
    expect(result.total).toBeGreaterThan(0);
  });

  it("counts skill terms from category text and exposes recency tier helper", () => {
    expect(countSkillTermsFromTextV2("Cloud: AWS, Kubernetes\nData: SQL, Spark")).toBe(4);
    expect(getReadinessRecencyTierV2(0)).toBe("recent");
    expect(getReadinessRecencyTierV2(2)).toBe("older");
  });

  it("maps custom sections into ATS compliance validation", () => {
    const result = computeResumeReadinessV2(
      minimalPrime({
        customSections: [{ title: "Projects", content: "Built internal tooling." }],
      }),
      "Director",
      jd,
      { pageMode: "2", skillsText: "Cloud: AWS, Kubernetes, Terraform" },
    );
    expect(result.pillars.atsCompliance.score).toBeGreaterThan(0);
  });
});

describe("v2 branch coverage — prompts", () => {
  it.each(PAGE_MODES)("buildDeepSeekPromptV2 includes mode %s budget lines", (mode) => {
    const prompt = buildDeepSeekPromptV2({
      pageMode: mode,
      targetRole: "Director",
      resumeSourceText: "Resume body",
      jobDescription: "Job description",
      mustWeaveKeywords: ["kubernetes"],
      mustAddSkills: ["terraform"],
    });
    if (mode === "4+") {
      expect(prompt).toContain("no content length limits");
    } else if (mode === "1") {
      expect(prompt).toContain("1 page (tight ATS budget)");
    } else if (mode === "3") {
      expect(prompt).toContain("3 pages");
    } else {
      expect(prompt).toContain("2 pages");
    }
    expect(prompt).toContain("kubernetes");
    expect(prompt).toContain("terraform");
  });
});

describe("v2 branch coverage — UI helpers", () => {
  it("resumeLengthOptionsForRules switches v1 vs v2 option sets", () => {
    const v1 = resumeLengthOptionsForRules(false);
    const v2 = resumeLengthOptionsForRules(true);
    expect(v1.some((o) => o.id === "auto")).toBe(true);
    expect(v2.some((o) => o.id === "4+")).toBe(true);
    expect(v2.find((o) => o.id === "4+")?.description).toBeTruthy();
  });

  it("isV2PageModeValue distinguishes v2 modes from auto", () => {
    expect(isV2PageModeValue("4+")).toBe(true);
    expect(isV2PageModeValue("auto")).toBe(false);
  });
});

describe("v2 branch coverage — rules config", () => {
  it("isUnlimitedResumeRulesProfileV2 identifies extended mode", () => {
    expect(isUnlimitedResumeRulesProfileV2(RESUME_RULES_V2_EXTENDED)).toBe(true);
    expect(isUnlimitedResumeRulesProfileV2(RESUME_RULES_V2_TWO_PAGE)).toBe(false);
  });

  it("resolveResumeRulesProfileV2 returns null for unsupported page mode", () => {
    expect(resolveResumeRulesProfileV2("9" as "1")).toBeNull();
  });

  it.each(PAGE_MODES)("resolveResumeRulesProfileV2(%s) is stable", (mode) => {
    expect(resolveResumeRulesProfileV2(mode)?.pageMode).toBe(mode);
  });
});

describe("v2 branch coverage — feature resolver", () => {
  it("resolveResumeRulesV2Feature returns disabled when flag off", async () => {
    const { getFeatureFlags } = await import("@/src/lib/services/feature-flags-service");
    vi.spyOn(await import("@/src/lib/services/feature-flags-service"), "getFeatureFlags").mockResolvedValueOnce({
      enhanceWithAiResumeProfile: true,
      extensionGlobalSwitch: true,
      extensionAutoApply: true,
      extensionApplyPipelineStepAnalytics: false,
      systemAiEnabled: true,
      aiJdExtractEnabled: false,
      resumeRulesV2: false,
    });
    const result = await resolveResumeRulesV2Feature({ id: "u1" }, "job_apply", "2");
    expect(result.enabled).toBe(false);
    void getFeatureFlags;
  });
});
