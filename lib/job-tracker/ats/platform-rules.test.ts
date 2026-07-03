import { describe, expect, it } from "vitest";
import { fingerprintAtsFromUrl } from "@/src/shared/extension/ats-fingerprint";
import {
  detectPlatform,
  getPlatformRules,
  resolvePlatformStrategy,
} from "@/lib/job-tracker/ats/platform-rules";
import {
  ATS_URL_PATTERNS,
  KNOWN_ATS_PLATFORMS,
  resolveJobTrackerPlatform,
} from "@/src/shared/ats-platform-detection";

describe("ats-platform-detection", () => {
  const urlCases: Array<{ url: string; platform: (typeof KNOWN_ATS_PLATFORMS)[number] }> = [
    { url: "https://www.linkedin.com/jobs/view/123", platform: "linkedin" },
    { url: "https://www.indeed.com/viewjob?jk=abc", platform: "indeed" },
    { url: "https://jobs.lever.co/acme/abc", platform: "lever" },
    { url: "https://jobs.ashbyhq.com/acme/abc", platform: "ashby" },
    { url: "https://acme.successfactors.com/careers", platform: "successfactors" },
    { url: "https://recruiting.paylocity.com/recruiting/jobs/Details/1", platform: "paylocity" },
    { url: "https://www.paycomonline.net/v4/ats/web.php/jobs", platform: "paycom" },
    { url: "https://acme.applytojob.com/apply/abc", platform: "jazzhr" },
    { url: "https://ats.rippling.com/acme/jobs/abc", platform: "rippling" },
    {
      url: "https://fa-evdn-saasfaprod1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/123",
      platform: "oraclecloud",
    },
    { url: "https://acme.breezy.hr/p/abc123", platform: "breezy" },
    { url: "https://acme.recruitee.com/o/senior-engineer", platform: "recruitee" },
    { url: "https://wellfound.com/jobs/123456", platform: "wellfound" },
    { url: "https://www.ziprecruiter.com/jobs/abc", platform: "ziprecruiter" },
    { url: "https://acme.teamtailor.com/jobs/123", platform: "teamtailor" },
  ];

  it("every known platform has at least one URL pattern", () => {
    const platformsInPatterns = new Set(ATS_URL_PATTERNS.map((entry) => entry.platform));
    for (const platform of KNOWN_ATS_PLATFORMS) {
      expect(platformsInPatterns.has(platform), platform).toBe(true);
    }
  });

  it.each(urlCases)("detectPlatform($url) → $platform", ({ url, platform }) => {
    expect(detectPlatform(url, null)).toBe(platform);
  });

  it("resolveJobTrackerPlatform prefers URL fingerprint over generic client platform", () => {
    expect(
      resolveJobTrackerPlatform(
        "https://acme.successfactors.com/careers/job/1",
        "generic",
      ),
    ).toBe("successfactors");
    expect(
      resolveJobTrackerPlatform(
        "https://fa-evdn-saasfaprod1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/123",
        "generic",
      ),
    ).toBe("oraclecloud");
    expect(
      resolveJobTrackerPlatform("https://jobs.cvshealth.com/us/en/job/R0942300", "generic"),
    ).toBe("phenom");
  });

  it("resolveJobTrackerPlatform returns null for non-ATS client tokens without URL match", () => {
    expect(resolveJobTrackerPlatform("https://example.com/job/1", "generic")).toBeNull();
    expect(resolveJobTrackerPlatform("https://example.com/job/1", "dashboard_manual")).toBeNull();
  });
});

describe("platform-rules", () => {
  it("detectPlatform resolves from job URL", () => {
    expect(detectPlatform("https://company.myworkdayjobs.com/en-US/job/123", null)).toBe(
      "workday",
    );
    expect(detectPlatform("https://boards.greenhouse.io/acme/jobs/1", null)).toBe("greenhouse");
    expect(detectPlatform("https://apply.workable.com/acme/j/abc", null)).toBe("workable");
    expect(detectPlatform("https://example.com/jobs/1", null)).toBe("unknown");
  });

  it("detectPlatform falls back to platform field", () => {
    expect(detectPlatform("https://example.com", "Greenhouse")).toBe("greenhouse");
    expect(detectPlatform("https://example.com", "LinkedIn")).toBe("linkedin");
    expect(detectPlatform("https://example.com", "Indeed")).toBe("indeed");
  });

  it("every known platform has PLATFORM_RULES entry with strategy", () => {
    for (const platform of KNOWN_ATS_PLATFORMS) {
      const rules = getPlatformRules(platform);
      expect(rules.label.length).toBeGreaterThan(0);
      expect(rules.strategy).toMatch(/^(keyword_search|ai_match|parse_first|human_review)$/);
      expect(rules.tip.length).toBeGreaterThan(0);
    }
  });

  it("unknown platform uses keyword_search strategy baseline", () => {
    expect(resolvePlatformStrategy("unknown")).toBe("keyword_search");
    expect(getPlatformRules("unknown").strategy).toBe("keyword_search");
  });

  it("greenhouse uses human_review strategy", () => {
    const rules = getPlatformRules("greenhouse");
    expect(rules.strategy).toBe("human_review");
    expect(rules.skillsSectionWeighted).toBe(false);
    expect(rules.tip).toMatch(/human scorecards/i);
    expect(rules.tip).toMatch(/quantified achievement bullets/i);
    expect(rules.tip).not.toMatch(/focus on keyword density/i);
  });

  it("workday uses parse_first strategy", () => {
    expect(getPlatformRules("workday").strategy).toBe("parse_first");
  });

  it("getPlatformRules returns rule metadata", () => {
    const rules = getPlatformRules("workday");
    expect(rules.label).toBe("Workday");
    expect(rules.preferredFormat).toBe("word");
    expect(rules.exactKeywordMatch).toBe(true);
    expect(rules.tip).toMatch(/Workday/i);
  });
});

describe("ats-fingerprint extension mapping", () => {
  it("maps dedicated extension platforms correctly (not generic)", () => {
    expect(fingerprintAtsFromUrl("https://acme.successfactors.com/careers").suggestedPlatform).toBe(
      "successfactors",
    );
    expect(fingerprintAtsFromUrl("https://apply.workable.com/acme/j/abc").suggestedPlatform).toBe(
      "workable",
    );
    expect(fingerprintAtsFromUrl("https://acme.bamboohr.com/careers").suggestedPlatform).toBe(
      "bamboohr",
    );
  });

  it("maps platforms without extension adapters to generic", () => {
    expect(
      fingerprintAtsFromUrl(
        "https://fa-evdn-saasfaprod1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/123",
      ).suggestedPlatform,
    ).toBe("generic");
  });
});
