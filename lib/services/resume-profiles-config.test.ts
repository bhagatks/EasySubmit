import { describe, expect, it } from "vitest";
import {
  RESUME_PROFILES_DEFAULTS,
  parseResumeProfilesConfig,
} from "@/src/lib/services/resume-profiles-config";

describe("parseResumeProfilesConfig", () => {
  it("defaults to 20 profiles per customer", () => {
    expect(parseResumeProfilesConfig(null)).toEqual(RESUME_PROFILES_DEFAULTS);
    expect(RESUME_PROFILES_DEFAULTS.maxProfilesPerCustomer).toBe(20);
  });

  it("parses maxProfilesPerCustomer from json", () => {
    expect(parseResumeProfilesConfig({ maxProfilesPerCustomer: 5 })).toEqual({
      maxProfilesPerCustomer: 5,
    });
  });

  it("falls back when value is invalid", () => {
    expect(parseResumeProfilesConfig({ maxProfilesPerCustomer: 0 })).toEqual(
      RESUME_PROFILES_DEFAULTS,
    );
    expect(parseResumeProfilesConfig({ maxProfilesPerCustomer: "20" })).toEqual(
      RESUME_PROFILES_DEFAULTS,
    );
  });
});
