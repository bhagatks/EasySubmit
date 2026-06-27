import { describe, expect, it } from "vitest";
import {
  applicationProfilePatchFromScreen1,
  applicationProfilePatchFromScreen2,
  emptyApplicationProfile,
  isApplicationProfileSetupComplete,
  mergeApplicationProfile,
  syncProfileSetupDraftsFromProfile,
  validateProfileSetupScreen1,
} from "@/lib/profile/application-profile-setup";

describe("applicationProfile setup helpers", () => {
  it("treats profile as incomplete without workAuth and preferences", () => {
    expect(isApplicationProfileSetupComplete(null)).toBe(false);
    expect(isApplicationProfileSetupComplete(emptyApplicationProfile())).toBe(false);
    expect(
      isApplicationProfileSetupComplete({
        ...emptyApplicationProfile(),
        workAuth: {
          authorized: true,
          authorizedCountry: "US",
          requiresSponsorship: false,
        },
      }),
    ).toBe(false);
  });

  it("merges top-level profile keys without dropping unrelated sections", () => {
    const merged = mergeApplicationProfile(
      {
        workAuth: {
          authorized: true,
          authorizedCountry: "US",
          requiresSponsorship: false,
        },
        preferences: {
          salary: { min: 100_000, max: 140_000, currency: "USD", signals: [] },
          earliestStart: "2_weeks",
          workMode: "remote",
        },
        address: null,
        eeo: null,
      },
      {
        eeo: {
          gender: "Prefer not to say",
          veteran: "Prefer not to say",
          disability: "Prefer not to say",
        },
      },
    );

    expect(merged.workAuth?.authorizedCountry).toBe("US");
    expect(merged.preferences?.workMode).toBe("remote");
    expect(merged.eeo?.gender).toBe("Prefer not to say");
  });

  it("flags missing salary range on screen 1 validation", () => {
    const issues = validateProfileSetupScreen1({
      authorized: "yes",
      authorizedCountry: "US",
      requiresSponsorship: "no",
      salaryMin: "",
      salaryMax: "",
      earliestStart: "2_weeks",
      workMode: "remote",
    });

    expect(issues.some((issue) => issue.field === "salaryMin")).toBe(true);
    expect(issues.some((issue) => issue.field === "salaryMax")).toBe(true);
  });

  it("flags salary max below min on screen 1 validation", () => {
    const issues = validateProfileSetupScreen1({
      authorized: "yes",
      authorizedCountry: "US",
      requiresSponsorship: "no",
      salaryMin: "150000",
      salaryMax: "120000",
      earliestStart: "2_weeks",
      workMode: "remote",
    });

    expect(issues.some((issue) => issue.field === "salaryMax")).toBe(true);
  });

  it("accepts complete screen 1 draft", () => {
    const issues = validateProfileSetupScreen1({
      authorized: "yes",
      authorizedCountry: "US",
      requiresSponsorship: "no",
      salaryMin: "120000",
      salaryMax: "150000",
      earliestStart: "2_weeks",
      workMode: "remote",
    });

    expect(issues).toHaveLength(0);
  });

  it("builds screen 1 patch from draft values", () => {
    const patch = applicationProfilePatchFromScreen1({
      authorized: "yes",
      authorizedCountry: "US",
      requiresSponsorship: "no",
      salaryMin: "120000",
      salaryMax: "150000",
      earliestStart: "1_month",
      workMode: "hybrid",
    });

    expect(patch.workAuth).toEqual({
      authorized: true,
      authorizedCountry: "US",
      requiresSponsorship: false,
    });
    expect(patch.preferences?.salary).toEqual({
      min: 120_000,
      max: 150_000,
      currency: "USD",
      signals: [],
    });
    expect(patch.preferences?.earliestStart).toBe("1_month");
  });

  it("maps screen 2 EEO values to display labels", () => {
    const patch = applicationProfilePatchFromScreen2({
      gender: "woman",
      veteran: "not_veteran",
      disability: "no",
    });

    expect(patch.eeo).toEqual({
      gender: "Woman",
      veteran: "I am not a protected veteran",
      disability: "No",
    });
  });

  it("round-trips saved profile into setup drafts", () => {
    const profile = mergeApplicationProfile(null, {
      workAuth: {
        authorized: false,
        authorizedCountry: "CA",
        requiresSponsorship: true,
      },
      preferences: {
        salary: { min: 90_000, max: 110_000, currency: "USD", signals: [] },
        earliestStart: "immediately",
        workMode: "onsite",
      },
      eeo: {
        gender: "Woman",
        veteran: "Prefer not to say",
        disability: "No",
      },
    });

    const drafts = syncProfileSetupDraftsFromProfile(profile);
    expect(drafts.screen1.authorized).toBe("no");
    expect(drafts.screen1.authorizedCountry).toBe("CA");
    expect(drafts.screen1.salaryMin).toBe("90000");
    expect(drafts.screen2.gender).toBe("woman");
  });
});
