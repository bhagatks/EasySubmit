import { describe, expect, it } from "vitest";
import { resolveFromApplicationProfile } from "@/src/shared/extension/application-profile-resolve";
import type { ApplicationProfile } from "@/lib/profile/application-profile";

const profile: ApplicationProfile = {
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
  address: {
    line1: "123 Main St",
    city: "Austin",
    state: "TX",
    postal: "78701",
    country: "US",
  },
  eeo: {
    gender: "Woman",
    veteran: "I am not a protected veteran",
    disability: "No",
  },
  education: null,
  identityExtras: null,
};

describe("resolveFromApplicationProfile", () => {
  it("resolves work authorization fields", () => {
    expect(
      resolveFromApplicationProfile("Are you authorized to work in the US?", "select", profile),
    ).toBe("Yes");
    expect(resolveFromApplicationProfile("Do you require visa sponsorship?", "radio", profile)).toBe(
      "No",
    );
    expect(resolveFromApplicationProfile("Country of authorization", "text", profile)).toBe("US");
  });

  it("resolves salary midpoint and bounds", () => {
    expect(resolveFromApplicationProfile("Expected salary", "text", profile)).toBe("120000");
    expect(resolveFromApplicationProfile("Minimum salary", "text", profile)).toBe("100000");
    expect(resolveFromApplicationProfile("Maximum compensation", "text", profile)).toBe("140000");
  });

  it("resolves address and EEO fields", () => {
    expect(resolveFromApplicationProfile("Street address", "text", profile)).toBe("123 Main St");
    expect(resolveFromApplicationProfile("City", "text", profile)).toBe("Austin");
    expect(resolveFromApplicationProfile("Gender identity", "select", profile)).toBe("Woman");
    expect(resolveFromApplicationProfile("Available to start", "text", profile)).toBe("2 weeks");
  });

  it("returns null for file fields and missing sections", () => {
    expect(resolveFromApplicationProfile("Upload resume", "file", profile)).toBeNull();
    expect(
      resolveFromApplicationProfile("Are you authorized to work?", "select", {
        ...profile,
        workAuth: null,
      }),
    ).toBeNull();
  });
});
