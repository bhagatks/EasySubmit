import { describe, expect, it } from "vitest";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  repairResumeFormForReadiness,
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
  it("splits on clause boundary instead of truncating mid-sentence", () => {
    const long =
      "Led data architecture modernization initiatives for the 7Now Delivery Platform, directing cross-functional teams through prototyping and data migration strategies that achieved 10x improvement in platform reliability and reduced integration latency across regions.";
    const parts = splitLongBullet(long);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(200);
      expect(part).not.toMatch(/\b(in|on|at|to|for|of|with|by|that|which)$/i);
    }
    expect(parts.join(" ")).toContain("10x improvement");
    expect(parts.some((p) => p.includes("7Now Delivery Platform"))).toBe(true);
  });

  it("preserves full text across split segments", () => {
    const long =
      "Established modular and scalable architecture practices aligned with data governance and cybersecurity standards, ensuring data quality across AWS cloud-native data pipelines while mentoring engineering teams on best practices for resilient platform design.";
    const parts = splitLongBullet(long);
    const rejoined = parts.join(" ");
    expect(rejoined).toContain("data governance");
    expect(rejoined).toContain("AWS cloud-native");
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

  it("skips keyword-gap skills merge when skipSkillsMerge is set", () => {
    const formWithSkills = { ...BASE_FORM, skillsText: "TypeScript" };
    const { form, repairs } = repairResumeFormForReadiness(formWithSkills, {
      targetRole: "Director, AI/ML and Data Architecture",
      jobDescription: "Requires GitHub and GitHub Copilot experience.",
      skipSkillsMerge: true,
    });
    expect(form.skillsText).toBe("TypeScript");
    expect(repairs).not.toContain("skills_keywords_merged");
  });
});
