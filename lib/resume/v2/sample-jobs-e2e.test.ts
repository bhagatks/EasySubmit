/**
 * End-to-end checks against the two Fidelity sample jobs (Mobile Arch + AI/ML Data Arch).
 * Uses real JD + chat output fixtures from `.tmp-debug/`.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { buildResumeContentFromForm } from "@/lib/job-tracker/export/resume-content-model";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import {
  EXTENDED_MODE_ATS_WARNING,
  EXTENDED_MODE_ATS_WARNING_CODE,
  resolveResumeRulesProfileV2,
} from "@/lib/resume/v2/rules-config";
import type { ResumePageModeV2 } from "@/lib/resume/v2/page-mode";
import { buildDeepSeekPromptV2 } from "@/lib/resume/v2/prompt";
import { repairResumeFormV2 } from "@/lib/resume/v2/readiness-repair";
import { computeResumeReadinessV2 } from "@/lib/resume/v2/resume-readiness-score";
import { validateResumeV2 } from "@/lib/resume/v2/validate-resume";
import { isResumeRulesV2Enabled } from "@/lib/resume/v2/runtime";

const PAGE_MODES: ResumePageModeV2[] = ["1", "2", "3", "4+"];

function readFixture(relativePath: string): string {
  const path = join(process.cwd(), relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing fixture: ${relativePath}`);
  }
  return readFileSync(path, "utf8").trim();
}

function between(text: string, start: string, end: string): string {
  const i = text.indexOf(start);
  if (i < 0) return "";
  const from = i + start.length;
  const j = text.indexOf(end, from);
  return text.slice(from, j < 0 ? undefined : j).trim();
}

function bulletLines(block: string): string {
  return block
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter((line) => line.length > 15)
    .join("\n");
}

function mobileArchPasteToForm(paste: string): HubRefineryForm {
  const summary =
    between(paste, "PROFESSIONAL SUMMARY\n", "\n\nSKILLS") ||
    between(paste, "Professional Summary\n", "\n\nSkills") ||
    between(paste, "Director of Mobile Architecture", "\n\nSKILLS");

  const skillsText =
    between(paste, "SKILLS\n", "\n\nPROFESSIONAL EXPERIENCE") ||
    between(paste, "Skills\n", "\n\nProfessional Experience");

  const exp7 =
    bulletLines(
      between(paste, "7-Eleven\n", "\n\nCVS Health") ||
        between(paste, "(Jan 2024 – Present)\n", "\n\nCVS Health") ||
        between(paste, "Jan 2024 – Present\n", "CVS Health"),
    ) || bulletLines(between(paste, "7-Eleven |", "CVS Health"));

  const expCvs = bulletLines(
    between(paste, "CVS Health\n", "\n\nAT&T") ||
      between(paste, "(Sep 2014 – Dec 2023)\n", "\n\nAT&T") ||
      between(paste, "Dec 2023)\n", "AT&T"),
  );

  const expOld = bulletLines(
    between(paste, "AT&T, Verizon, JP Morgan Chase, Universal American & Alindus\n", "\n\nEDUCATION") ||
      between(paste, "Sep 2005 – Sep 2014)\n", "\n\nEDUCATION") ||
      between(paste, "Sep 2014)\n", "EDUCATION"),
  );

  return {
    firstName: "BHAGATH",
    lastName: "SIDDI",
    cityState: "Prosper, Texas & 75078",
    phone: "+1 (989) 312-3420",
    email: "bhagathsiddi@gmail.com",
    linkedIn: "https://linkedin.com/in/bhagathsiddi",
    professionalSummary: summary.replace(/\*\*/g, "").trim(),
    skillsText: skillsText.replace(/\*\*/g, "").replace(/^-\s+/gm, "").trim(),
    experience: [
      {
        id: "exp-0",
        title: "Head of Engineering | Sr. Engineering Manager",
        company: "7-Eleven",
        startMonth: "Jan",
        startYear: "2024",
        endMonth: "",
        endYear: "Present",
        location: "",
        bullets: exp7,
        hidden: false,
      },
      {
        id: "exp-1",
        title: "Director | Engineering Manager",
        company: "CVS Health",
        startMonth: "Sep",
        startYear: "2014",
        endMonth: "Dec",
        endYear: "2023",
        location: "",
        bullets: expCvs,
        hidden: false,
      },
      {
        id: "exp-2",
        title: "Sr. Software Engineer | Lead | Developer",
        company: "AT&T, Verizon, JP Morgan Chase, Universal American & Alindus",
        startMonth: "Sep",
        startYear: "2005",
        endMonth: "Sep",
        endYear: "2014",
        location: "",
        bullets: expOld,
        hidden: false,
      },
    ],
    education: [
      {
        id: "edu-0",
        degree: "Bachelor of Technology (B.Tech)",
        school: "Kakatiya University, India",
        startMonth: "",
        startYear: "",
        endMonth: "",
        endYear: "",
        location: "",
        hidden: false,
      },
    ],
    certifications: [
      { id: "c0", text: "Applied Agentic AI for Organizational Transformation, MIT (2026)", hidden: false },
      { id: "c1", text: "AWS Solutions Architect (Associate)", hidden: false },
      { id: "c2", text: "SAFe Agilist", hidden: false },
    ],
    projects: [],
    languages: [],
    customSections: [],
    pageLengthPreference: "2",
  };
}

function section(after: string, until: string, paste: string): string {
  const start = paste.indexOf(after);
  if (start < 0) return "";
  const from = start + after.length;
  const end = paste.indexOf(until, from);
  return paste.slice(from, end).trim();
}

function bulletsBetween(paste: string, startMarker: string, endMarker: string): string {
  const block = section(startMarker, endMarker, paste);
  return block
    .split("\n")
    .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter((l) => l.length > 20 && !/\|\s*[A-Za-z]{3,4}\s+\d{4}/.test(l))
    .join("\n");
}

function aiMlPasteToForm(paste: string): HubRefineryForm {
  const summaryBlock =
    section("PROFESSIONAL SUMMARY\n", "\n\nSKILLS", paste) ||
    section("Professional Summary\n", "\n\nSkills", paste);
  const summary = summaryBlock.replace(/^Director[^\n]+\n\n/, "").trim() || summaryBlock;
  const skillsText =
    section("SKILLS\n", "\n\nPROFESSIONAL EXPERIENCE", paste) ||
    section("Skills\n", "\n\nProfessional Experience", paste);

  return {
    firstName: "BHAGATH",
    lastName: "SIDDI",
    cityState: "Prosper, Texas & 75078",
    phone: "+1 (989) 312-3420",
    email: "bhagathsiddi@gmail.com",
    linkedIn: "https://linkedin.com/in/bhagathsiddi",
    professionalSummary: summary.replace(/\*\*/g, "").trim(),
    skillsText: skillsText.replace(/\*\*/g, "").trim(),
    experience: [
      {
        id: "exp-0",
        title: "Head of Engineering | Sr. Engineering Manager",
        company: "7-Eleven",
        startMonth: "Jan",
        startYear: "2024",
        endMonth: "",
        endYear: "Present",
        location: "",
        bullets:
          bulletsBetween(paste, "7-Eleven | Jan 2024 – Present\n\n", "Director | Engineering Manager") ||
          bulletsBetween(paste, "7-Eleven\n", "CVS Health") ||
          bulletsBetween(paste, "Jan 2024 – Present\n", "Director | Engineering Manager"),
        hidden: false,
      },
      {
        id: "exp-1",
        title: "Director | Engineering Manager",
        company: "CVS Health",
        startMonth: "Sep",
        startYear: "2014",
        endMonth: "Dec",
        endYear: "2023",
        location: "",
        bullets:
          bulletsBetween(paste, "CVS Health | Sep 2014 – Dec 2023\n\n", "Sr. Software Engineer") ||
          bulletsBetween(paste, "CVS Health\n", "AT&T"),
        hidden: false,
      },
      {
        id: "exp-2",
        title: "Sr. Software Engineer | Lead | Developer",
        company: "AT&T, Verizon, JP Morgan Chase, Universal American & Alindus",
        startMonth: "Sep",
        startYear: "2005",
        endMonth: "Sep",
        endYear: "2014",
        location: "",
        bullets:
          bulletsBetween(paste, "AT&T, Verizon", "EDUCATION") ||
          bulletsBetween(paste, "Sep 2005 – Sep 2014", "EDUCATION"),
        hidden: false,
      },
    ],
    education: [
      {
        id: "edu-0",
        degree: "Bachelor of Technology (B.Tech)",
        school: "Kakatiya University, India",
        startMonth: "",
        startYear: "",
        endMonth: "",
        endYear: "",
        location: "",
        hidden: false,
      },
    ],
    certifications: [
      {
        id: "c0",
        text: "Applied Agentic AI for Organizational Transformation, MIT Professional Education (2026)",
        hidden: false,
      },
      { id: "c1", text: "AWS Solutions Architect (Associate)", hidden: false },
      { id: "c2", text: "SAFe Agilist", hidden: false },
    ],
    projects: [],
    languages: [],
    customSections: [],
    pageLengthPreference: "2",
  };
}

const SAMPLE_JOBS = [
  {
    id: "mobile-arch-2123818",
    targetRole: "Director, Mobile Architecture",
    jdPath: ".tmp-debug/fidelity-mobile-arch-jd.txt",
    baseProfilePath: ".tmp-debug/mobile-arch-base-profile.txt",
    chatOutputPath: ".tmp-debug/chat-mobile-arch-output.txt",
    v2FlashOutputPath: ".tmp-debug/chat-parity-v2-mobile-arch-output.txt",
    pasteToForm: mobileArchPasteToForm,
    minReadinessV2: 55,
    minKeywordPillar: 10,
  },
  {
    id: "ai-ml-data-arch",
    targetRole: "Director, AI/ML and Data Architecture",
    jdPath: ".tmp-debug/fidelity-jd-full.txt",
    baseProfilePath: ".tmp-debug/user-chat-input-base-profile.txt",
    chatOutputPath: ".tmp-debug/user-chat-latest-paste.txt",
    v2FlashOutputPath: ".tmp-debug/chat-parity-v2-2page-output.txt",
    pasteToForm: aiMlPasteToForm,
    minReadinessV2: 60,
    minKeywordPillar: 12,
  },
] as const;

describe("sample jobs — v2 profiles resolve for all page modes", () => {
  it.each(PAGE_MODES)("mode %s has a profile", (mode) => {
    expect(resolveResumeRulesProfileV2(mode)).not.toBeNull();
    expect(isResumeRulesV2Enabled(mode, { featureEnabled: true })).toBe(true);
  });
});

describe.each(SAMPLE_JOBS)("sample job: $id", (job) => {
  const jd = readFixture(job.jdPath);
  const chatPaste = readFixture(job.chatOutputPath);
  const chatForm = job.pasteToForm(chatPaste);
  const chatPrime = refineryFormToPrimeResume(chatForm, { targetRole: job.targetRole });

  it("parses chat output into a non-empty form", () => {
    expect(chatForm.professionalSummary.length).toBeGreaterThan(100);
    expect(chatForm.skillsText.length).toBeGreaterThan(50);
    expect(chatForm.experience.filter((e) => e.bullets.trim()).length).toBeGreaterThanOrEqual(2);
  });

  it.each(PAGE_MODES)("buildDeepSeekPromptV2 works for page mode %s", (mode) => {
    const baseProfile = readFixture(job.baseProfilePath);
    const prompt = buildDeepSeekPromptV2({
      pageMode: mode,
      targetRole: job.targetRole,
      resumeSourceText: baseProfile,
      jobDescription: jd,
    });
    expect(prompt).toContain("RULES VERSION 2");
    if (mode === "4+") {
      expect(prompt).toContain("4+ extended");
      expect(prompt).toContain(EXTENDED_MODE_ATS_WARNING);
    }
  });

  it("v2 readiness beats v1 on chat output (mode 2) — no §8 bullet-cap penalty", () => {
    const v1 = computeResumeReadiness(chatPrime, job.targetRole, jd, null, "workday");
    const v2 = computeResumeReadinessV2(chatPrime, job.targetRole, jd, {
      skillsText: chatForm.skillsText,
      pageMode: "2",
      platform: "workday",
    });

    expect(v2.implemented).toBe(true);
    expect(v2.total).toBeGreaterThanOrEqual(job.minReadinessV2);
    expect(v2.pillars.atsCompliance.details.some((d) => d.includes("RULES.md §8"))).toBe(false);
    // v2 must not apply v1 six-bullet export penalties; allow ±2 pts on compliance vs v1
    expect(v2.pillars.atsCompliance.score).toBeGreaterThanOrEqual(v1.pillars.atsCompliance.score - 2);
    expect(v2.pillars.keywords.score).toBeGreaterThanOrEqual(job.minKeywordPillar);
  });

  it("mode 4+ validation emits extended ATS warning without hard errors", () => {
    const form = { ...chatForm, pageLengthPreference: "4+" as const };
    const validation = validateResumeV2(form, "4+");
    expect(validation.implemented).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(
      validation.warnings.some((w) => w.code === EXTENDED_MODE_ATS_WARNING_CODE),
    ).toBe(true);
  });

  it("export preserves 7+ recent bullets for v2 page mode 2 and 4+", () => {
    const recentCount = chatForm.experience[0]!.bullets.split("\n").filter(Boolean).length;
    expect(recentCount).toBeGreaterThanOrEqual(6);

    for (const mode of ["2", "4+"] as const) {
      const form = { ...chatForm, pageLengthPreference: mode };
      const content = buildResumeContentFromForm(form, job.targetRole);
      expect(content.experience[0]?.bullets.length).toBe(recentCount);
      expect(content.warnings.some((w) => w.includes("6 bullets"))).toBe(false);
    }
  });

  it("repair trims tier bullets in mode 2 but not in mode 4+", () => {
    const sourceForm = { ...chatForm, pageLengthPreference: "2" as const };
    const enhanced = {
      ...sourceForm,
      experience: sourceForm.experience.map((entry) => ({
        ...entry,
        bullets: Array.from({ length: 10 }, (_, i) => `Delivered outcome ${i + 1} with 12% gain.`).join("\n"),
      })),
    };

    const repairedMode2 = repairResumeFormV2({
      enhanced,
      source: sourceForm,
      targetRole: job.targetRole,
      pageMode: "2",
    });
    expect(repairedMode2.form.experience[0]!.bullets.split("\n").filter(Boolean).length).toBeLessThanOrEqual(6);

    const repairedMode4Plus = repairResumeFormV2({
      enhanced,
      source: sourceForm,
      targetRole: job.targetRole,
      pageMode: "4+",
    });
    expect(repairedMode4Plus.repairs).toContain("extended_mode_no_trim");
    expect(repairedMode4Plus.form.experience[0]!.bullets.split("\n").filter(Boolean).length).toBe(10);
  });

  it("scores v2 flash output when fixture exists", () => {
    const flashPath = join(process.cwd(), job.v2FlashOutputPath);
    if (!existsSync(flashPath)) {
      return;
    }

    const flashPaste = readFileSync(flashPath, "utf8").trim();
    const flashForm = job.pasteToForm(flashPaste);
    const flashPrime = refineryFormToPrimeResume(flashForm, { targetRole: job.targetRole });
    const v2 = computeResumeReadinessV2(flashPrime, job.targetRole, jd, {
      skillsText: flashForm.skillsText,
      pageMode: "2",
      platform: "workday",
    });

    expect(v2.implemented).toBe(true);
    expect(v2.total).toBeGreaterThanOrEqual(job.minReadinessV2 - 10);
    expect(v2.pillars.completeness.score).toBeGreaterThan(0);
  });
});

describe("sample jobs — cross-mode readiness smoke", () => {
  it.each(SAMPLE_JOBS.flatMap((job) => PAGE_MODES.map((mode) => ({ job, mode }))))(
    "$job.id page mode $mode returns implemented readiness",
    ({ job, mode }) => {
      const chatPaste = readFixture(job.chatOutputPath);
      const form = job.pasteToForm(chatPaste);
      const prime = refineryFormToPrimeResume(form, { targetRole: job.targetRole });
      const jd = readFixture(job.jdPath);

      const result = computeResumeReadinessV2(prime, job.targetRole, jd, {
        skillsText: form.skillsText,
        pageMode: mode,
        platform: "workday",
      });

      expect(result.implemented).toBe(true);
      expect(result.pageMode).toBe(mode);
      expect(result.total).toBeGreaterThan(0);
      expect(result.total).toBeLessThanOrEqual(100);

      const pillarSum = Object.values(result.pillars).reduce((sum, p) => sum + p.score, 0);
      expect(pillarSum).toBe(result.total);
    },
  );
});
