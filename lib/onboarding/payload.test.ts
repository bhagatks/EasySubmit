import { describe, expect, it } from "vitest";
import { buildOnboardingPayload, isOnboardingComplete } from "@/lib/onboarding/payload";
import type { Location } from "@/src/stores/onboarding-store";

const targetLocations: Location[] = [
  { id: "1", name: "Boston, MA", isResidential: false },
  { id: "2", name: "Merrimack, NH", isResidential: true },
];

describe("onboarding payload", () => {
  it("builds payload with residential location and resume file name", () => {
    const payload = buildOnboardingPayload({
      jobTimeline: "In a Rush",
      targetLocations,
      experienceLevels: ["senior"],
      selectedRole: "Engineering Manager",
      minSalary: 180000,
      referralSource: "linkedin",
      resumeFile: { name: "resume.pdf" } as File,
      resumeFileName: null,
    });

    expect(payload.primaryAddress).toBe("Merrimack, NH");
    expect(payload.residentialLocation?.name).toBe("Merrimack, NH");
    expect(payload.resumeFileName).toBe("resume.pdf");
  });

  it("falls back to stored resume file name", () => {
    const payload = buildOnboardingPayload({
      jobTimeline: "In a Rush",
      targetLocations,
      experienceLevels: ["senior"],
      selectedRole: "Engineering Manager",
      minSalary: 180000,
      referralSource: "linkedin",
      resumeFile: null,
      resumeFileName: "stored.pdf",
    });

    expect(payload.resumeFileName).toBe("stored.pdf");
  });

  it("detects incomplete onboarding payloads", () => {
    const incomplete = buildOnboardingPayload({
      jobTimeline: null,
      targetLocations: [],
      experienceLevels: [],
      selectedRole: null,
      minSalary: 0,
      referralSource: null,
      resumeFile: null,
      resumeFileName: null,
    });

    expect(isOnboardingComplete(incomplete)).toBe(false);
  });

  it("detects complete onboarding payloads", () => {
    const complete = buildOnboardingPayload({
      jobTimeline: "In a Rush",
      targetLocations,
      experienceLevels: ["senior"],
      selectedRole: "Engineering Manager",
      minSalary: 180000,
      referralSource: "linkedin",
      resumeFile: null,
      resumeFileName: "resume.pdf",
    });

    expect(isOnboardingComplete(complete)).toBe(true);
  });
});
