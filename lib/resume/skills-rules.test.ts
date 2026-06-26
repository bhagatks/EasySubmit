import { describe, expect, it } from "vitest";
import {
  findBannedSkills,
  isBannedSkill,
  isProseSkill,
  validateSkillsManual,
  validateSkillsSystem,
} from "@/lib/resume/skills-rules";

describe("isBannedSkill", () => {
  it("matches banned terms case-insensitively", () => {
    expect(isBannedSkill("communication")).toBe(true);
    expect(isBannedSkill("Kubernetes")).toBe(false);
    expect(isBannedSkill("LEADERSHIP")).toBe(true);
  });
});

describe("isProseSkill", () => {
  it("detects verb-led and long entries", () => {
    expect(isProseSkill("Build cloud systems")).toBe(true);
    expect(isProseSkill("Five word skill entry here")).toBe(true);
    expect(isProseSkill("AWS")).toBe(false);
    expect(isProseSkill("Cross-functional Leadership")).toBe(false);
  });
});

describe("findBannedSkills", () => {
  it("returns only banned entries from a mixed list", () => {
    expect(findBannedSkills(["Kubernetes", "Communication", "TypeScript", "Teamwork"])).toEqual([
      "Communication",
      "Teamwork",
    ]);
  });
});

describe("validateSkillsManual", () => {
  it("warns below minimum", () => {
    const result = validateSkillsManual(["AWS", "React"]);
    expect(result.countWarning).toBe("Add at least 6 skills.");
  });

  it("passes within 6–15 skills", () => {
    const skills = ["AWS", "React", "Node.js", "PostgreSQL", "Docker", "Terraform"];
    expect(validateSkillsManual(skills).countWarning).toBeNull();
  });

  it("passes within 16–20 skills", () => {
    const skills = Array.from({ length: 18 }, (_, index) => `Skill ${index + 1}`);
    expect(validateSkillsManual(skills).countWarning).toBeNull();
  });

  it("warns above hard max", () => {
    const skills = Array.from({ length: 21 }, (_, index) => `Skill ${index + 1}`);
    expect(validateSkillsManual(skills).countWarning).toBe(
      "Too many skills — keep it to 20 or fewer.",
    );
  });

  it("returns banned terms", () => {
    const result = validateSkillsManual(["AWS", "Communication", "React"]);
    expect(result.banned).toEqual(["Communication"]);
  });
});

describe("validateSkillsSystem", () => {
  it("warns below system minimum", () => {
    const skills = Array.from({ length: 10 }, (_, index) => `Skill ${index + 1}`);
    expect(validateSkillsSystem(skills).countWarning).toMatch(/target: 15–20/);
  });

  it("passes within 15–20 skills", () => {
    const skills = Array.from({ length: 16 }, (_, index) => `Skill ${index + 1}`);
    const result = validateSkillsSystem(skills);
    expect(result.countWarning).toBeNull();
    expect(result.compositionWarning).toBeNull();
  });

  it("warns above hard max", () => {
    const skills = Array.from({ length: 21 }, (_, index) => `Skill ${index + 1}`);
    expect(validateSkillsSystem(skills).countWarning).toBe("Too many skills — trim to 20.");
  });

  it("warns when banned ratio is too high", () => {
    const result = validateSkillsSystem([
      "Communication",
      "Teamwork",
      "Leadership",
      "AWS",
      "React",
    ]);
    expect(result.compositionWarning).toBe(
      "Skills section contains too many generic soft skills.",
    );
  });
});
