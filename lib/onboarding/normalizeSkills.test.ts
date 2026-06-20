import { describe, expect, it } from "vitest";
import { normalizeSkillList } from "@/lib/onboarding/normalizeSkills";

describe("normalizeSkillList", () => {
  it("splits comma-joined strings into separate skills", () => {
    expect(normalizeSkillList(["React, TypeScript, Node.js"])).toEqual([
      "React",
      "TypeScript",
      "Node.js",
    ]);
  });

  it("dedupes case-insensitively", () => {
    expect(normalizeSkillList(["React", "react", "Python"])).toEqual([
      "React",
      "Python",
    ]);
  });
});
