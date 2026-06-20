import { beforeEach, describe, expect, it } from "vitest";
import {
  canProceedToCalibration,
  MIN_STUDIO_SKILLS,
  selectCanProceedToCalibration,
} from "@/lib/onboarding/studio";
import { useOnboardingStore } from "@/stores/onboardingStore";

const SAMPLE_SKILLS = ["React", "TypeScript", "Node.js", "AWS", "SQL", "Git"];

describe("canProceedToCalibration", () => {
  it("requires at least six selected skills (languages optional)", () => {
    expect(canProceedToCalibration({ skills: [] })).toBe(false);
    expect(canProceedToCalibration({ skills: SAMPLE_SKILLS })).toBe(true);
    expect(
      canProceedToCalibration({ skills: ["One", "Two", "Three", "Four", "Five"] }),
    ).toBe(false);
  });

  it("uses MIN_STUDIO_SKILLS threshold", () => {
    expect(MIN_STUDIO_SKILLS).toBe(6);
  });
});

describe("selectCanProceedToCalibration", () => {
  it("reads skills from studio state", () => {
    expect(
      selectCanProceedToCalibration({
        studio: { skills: SAMPLE_SKILLS },
      }),
    ).toBe(true);
  });
});

describe("toggleSkill behavior contract", () => {
  it("documents case-insensitive uniqueness expectation", () => {
    const skills = ["React", "Python"];
    const next = skills.some((entry) => entry.toLowerCase() === "react".toLowerCase())
      ? skills.filter((entry) => entry.toLowerCase() !== "react".toLowerCase())
      : [...skills, "react"];
    expect(next).toEqual(["Python"]);
  });
});

describe("useOnboardingStore studio skills", () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetStore();
  });

  it("toggleSkill adds and removes skills case-insensitively", () => {
    const { toggleSkill } = useOnboardingStore.getState();
    toggleSkill("React");
    toggleSkill("Python");
    expect(useOnboardingStore.getState().studio.skills).toEqual(["React", "Python"]);

    toggleSkill("react");
    expect(useOnboardingStore.getState().studio.skills).toEqual(["Python"]);
  });

  it("canProceedToCalibration reflects studio.skills only", () => {
    const store = useOnboardingStore.getState();
    expect(store.canProceedToCalibration()).toBe(false);

    for (const skill of ["A", "B", "C", "D", "E", "F"]) {
      store.toggleSkill(skill);
    }

    expect(useOnboardingStore.getState().canProceedToCalibration()).toBe(true);
  });

  it("addLanguage and removeLanguage manage language entries", () => {
    const store = useOnboardingStore.getState();
    store.addLanguage({ name: "English", level: "Native or Bilingual" });
    store.addLanguage({ name: "Spanish", level: "Full Professional" });
    expect(useOnboardingStore.getState().languages).toHaveLength(2);

    store.removeLanguage("English");
    expect(useOnboardingStore.getState().languages).toEqual([
      { name: "Spanish", level: "Full Professional" },
    ]);
  });
});
