import { describe, expect, it } from "vitest";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { WeakBulletTarget } from "@/lib/job-tracker/ats/job-intelligence";
import {
  cleanExperienceBullets,
  mergeSkills,
  removeSkills,
  rewriteWeakBullets,
} from "@/lib/job-tracker/enhance/apply-enhance-plan-helpers";

const BASE_FORM: HubRefineryForm = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "",
  cityState: "",
  linkedIn: "",
  professionalSummary: "",
  skillsText: "TypeScript, React",
  experience: [
    {
      id: "exp-0",
      title: "Engineer",
      company: "Acme",
      location: "",
      startMonth: "Jan",
      startYear: "2020",
      endMonth: "",
      endYear: "Present",
      bullets: "Responsible for API design\nHelped with deployments",
      hidden: false,
    },
  ],
  education: [],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
  pageLengthPreference: "auto",
};

describe("mergeSkills", () => {
  it("returns existing when nothing to add", () => {
    expect(mergeSkills("TypeScript, React", [])).toBe("TypeScript, React");
  });

  it("appends new skills without duplicates", () => {
    expect(mergeSkills("TypeScript, React", ["Python", "typescript"])).toBe(
      "TypeScript, React, Python",
    );
  });

  it("filters banned and prose skills", () => {
    const result = mergeSkills("TypeScript", [
      "communication",
      "experience with large scale distributed systems",
      "AWS",
    ]);
    expect(result).toBe("TypeScript, AWS");
  });
});

describe("removeSkills", () => {
  it("returns existing when nothing to remove", () => {
    expect(removeSkills("TypeScript, React", [])).toBe("TypeScript, React");
  });

  it("removes skills case-insensitively", () => {
    expect(removeSkills("TypeScript, React, Python", ["react", "Go"])).toBe("TypeScript, Python");
  });
});

describe("rewriteWeakBullets", () => {
  it("returns unchanged form when no weak bullets", () => {
    const result = rewriteWeakBullets(BASE_FORM, []);
    expect(result.bulletsRewritten).toBe(0);
    expect(result.form).toBe(BASE_FORM);
  });

  it("rewrites weak-phrase bullets", () => {
    const weakBullets: WeakBulletTarget[] = [
      { experienceIndex: 0, bulletIndex: 0, issues: ["weak-phrase"] },
      { experienceIndex: 0, bulletIndex: 1, issues: ["weak-phrase"] },
    ];
    const { form, bulletsRewritten } = rewriteWeakBullets(BASE_FORM, weakBullets);
    expect(bulletsRewritten).toBe(2);
    const bullets = form.experience![0].bullets!.split("\n");
    expect(bullets[0]).toMatch(/^Managed/i);
    expect(bullets[1]).toMatch(/^Contributed to/i);
  });

  it("applies domain verb for weak-verb bullets in tech domain", () => {
    const form: HubRefineryForm = {
      ...BASE_FORM,
      experience: [
        {
          ...BASE_FORM.experience![0],
          bullets: "microservices platform for payments",
        },
      ],
    };
    const weakBullets: WeakBulletTarget[] = [
      { experienceIndex: 0, bulletIndex: 0, issues: ["weak-verb"] },
    ];
    const { form: updated, bulletsRewritten } = rewriteWeakBullets(form, weakBullets);
    expect(bulletsRewritten).toBe(1);
    expect(updated.experience![0].bullets).toMatch(/^Executed/i);
  });

  it("uses Led as default verb for non-tech JD domains", () => {
    const form: HubRefineryForm = {
      ...BASE_FORM,
      experience: [
        {
          ...BASE_FORM.experience![0],
          bullets: "vendor relationships and procurement workflows",
        },
      ],
    };
    const weakBullets: WeakBulletTarget[] = [
      { experienceIndex: 0, bulletIndex: 0, issues: ["weak-verb"] },
    ];
    const { form: updated } = rewriteWeakBullets(
      form,
      weakBullets,
      "procurement-supply-chain",
    );
    expect(updated.experience![0].bullets).toMatch(/^Led/i);
  });
});

describe("cleanExperienceBullets", () => {
  it("normalizes bullet openings and strips markers", () => {
    const form: HubRefineryForm = {
      ...BASE_FORM,
      experience: [
        {
          ...BASE_FORM.experience![0],
          bullets: "• led team of 5\n- built api",
        },
      ],
    };
    const cleaned = cleanExperienceBullets(form);
    const lines = cleaned.experience![0].bullets!.split("\n");
    expect(lines.length).toBe(2);
    expect(lines.every((line) => !line.startsWith("•") && !line.startsWith("-"))).toBe(true);
  });
});
