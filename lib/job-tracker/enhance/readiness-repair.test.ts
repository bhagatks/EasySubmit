import { describe, expect, it } from "vitest";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  coalesceBrokenBulletLines,
  compressBulletToMax,
  repairResumeFormForReadiness,
  skillsKeywordsFromGap,
  splitLongBullet,
} from "@/lib/job-tracker/enhance/readiness-repair";

const BASE_FORM: HubRefineryForm = {
  firstName: "Test",
  lastName: "User",
  cityState: "Boston, MA",
  phone: "555-0100",
  email: "test@example.com",
  linkedIn: "",
  professionalSummary:
    "Engineering leader with over 21 years of experience designing enterprise systems and driving modernization. Expert in Generative AI and Git Hub Copilot for SDLC acceleration while ensuring data governance compliance. Proven track record in leading cross-functional teams through data migration and legacy modernization. Combines critical thinking with prototyping expertise across data pipelines.",
  skillsText: "Data Architecture, Git Hub Copilot, SDLC",
  experience: [
    {
      id: "exp-0",
      title: "Director",
      company: "Example Co",
      location: "",
      startMonth: "Jan",
      startYear: "2020",
      endMonth: "",
      endYear: "Present",
      bullets:
        "Lead data architecture modernization initiatives for the delivery platform, directing cross-functional teams of API and mobile engineers through complex data migration from third-party integrations to first-party systems across multiple regions.",
      hidden: false,
    },
  ],
  education: [],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
  pageLengthPreference: 2,
};

describe("splitLongBullet", () => {
  it("compresses overlong bullets to one complete line when possible", () => {
    const long =
      "Led data architecture modernization initiatives for the 7Now Delivery Platform, directing cross-functional teams through prototyping and data migration strategies that achieved 10x improvement in platform reliability and reduced integration latency across regions.";
    const parts = splitLongBullet(long);
    expect(parts.length).toBeGreaterThanOrEqual(1);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(200);
      expect(part).toMatch(/[.!?]$/);
      expect(part).not.toMatch(/\b(in|on|at|to|for|of|with|by|that|which)[.]?$/i);
    }
    expect(parts.join(" ")).toContain("10x improvement");
    expect(parts.some((p) => p.includes("7Now Delivery Platform"))).toBe(true);
  });

  it("splits at semicolons into standalone bullets with terminal punctuation", () => {
    const long =
      "Established modular and scalable architecture practices aligned with data governance and cybersecurity standards; ensured data quality across AWS cloud-native data pipelines while mentoring engineering teams on best practices for resilient platform design.";
    const parts = splitLongBullet(long);
    expect(parts.length).toBe(2);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(200);
      expect(part).toMatch(/[.!?]$/);
    }
  });

  it("preserves full text across split segments when semicolon split applies", () => {
    const long =
      "Established modular and scalable architecture practices aligned with data governance and cybersecurity standards; ensured data quality across AWS cloud-native data pipelines while mentoring engineering teams on best practices for resilient platform design.";
    const parts = splitLongBullet(long);
    const rejoined = parts.join(" ");
    expect(rejoined).toContain("data governance");
    expect(rejoined).toContain("AWS cloud-native");
  });
});

describe("compressBulletToMax", () => {
  it("drops trailing clause instead of leaving a with-fragment", () => {
    const compressed = compressBulletToMax(
      "Led data architecture modernization for the 7Now Delivery Platform, directing cross-functional teams in transforming legacy third-party integrations into a scalable first-party data platform with improved data quality standards.",
    );
    expect(compressed.length).toBeLessThanOrEqual(200);
    expect(compressed).not.toMatch(/\bwith improved data quality standards[.]?$/i);
    expect(compressed).toContain("first-party data platform");
  });
});

describe("coalesceBrokenBulletLines", () => {
  it("merges Android/Flutter line breaks into one bullet", () => {
    const lines = coalesceBrokenBulletLines(
      "Led platform work directing API, i OS, Android\nFlutter engineers to deliver integrations.",
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Android Flutter engineers");
  });

  it("merges with-clause continuations into the prior bullet", () => {
    const lines = coalesceBrokenBulletLines(
      "Led data architecture modernization for the 7Now Delivery Platform, directing teams in transforming legacy integrations into a scalable first-party data platform\nwith improved data quality standards.",
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("with improved data quality standards.");
  });
});

describe("repairResumeFormForReadiness", () => {
  it("normalizes GitHub tokens and shortens long bullets", () => {
    const { form, repairs } = repairResumeFormForReadiness(BASE_FORM, {
      targetRole: "Director, AI/ML and Data Architecture",
      jobDescription: "Requires GitHub and GitHub Copilot experience.",
    });

    expect(form.skillsText).toContain("GitHub Copilot");
    expect(form.skillsText).not.toContain("Git Hub");
    expect(form.professionalSummary).not.toMatch(/\bin leading\b/i);
    expect(repairs.length).toBeGreaterThan(0);

    const bullets = (form.experience?.[0]?.bullets ?? "").split("\n").filter(Boolean);
    for (const bullet of bullets) {
      expect(bullet.length).toBeLessThanOrEqual(200);
      expect(bullet).not.toMatch(/\b(in|on|at|to|for|of|with|by)$/i);
    }
  });

  it("merges missing JD keywords additively", () => {
    const formWithSkills = { ...BASE_FORM, skillsText: "TypeScript, React" };
    const { form, repairs } = repairResumeFormForReadiness(formWithSkills, {
      targetRole: "Director, AI/ML and Data Architecture",
      jobDescription:
        "Must have MySQL, BigQuery, and DevOps experience leading platform engineering teams.",
    });
    expect(form.skillsText).toMatch(/MySQL|BigQuery|DevOps/i);
    expect(repairs).toContain("skills_keywords_merged");
  });
});

describe("skillsKeywordsFromGap", () => {
  it("prioritizes injectable keywords before top missing", () => {
    const keywords = skillsKeywordsFromGap({
      matched: [],
      missing: ["DevOps", "MySQL"],
      coveragePercent: 50,
      exactCoveragePercent: 50,
      topMissing: ["MySQL"],
      injectable: ["DevOps"],
      nonInjectable: [],
    });
    expect(keywords[0]).toBe("DevOps");
    expect(keywords).toContain("MySQL");
  });
});
