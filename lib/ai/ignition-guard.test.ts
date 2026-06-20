import { describe, expect, it } from "vitest";
import {
  formatIgnitionLockMessage,
  isProviderAuthFailureCode,
} from "@/src/lib/ai/ignition-guard";

describe("ignition-guard", () => {
  it("detects provider auth failure codes", () => {
    expect(isProviderAuthFailureCode("invalid_key")).toBe(true);
    expect(isProviderAuthFailureCode("unauthorized")).toBe(true);
    expect(isProviderAuthFailureCode("forbidden")).toBe(true);
    expect(isProviderAuthFailureCode("missing_key")).toBe(false);
  });

  it("formats lock messages with optional detail", () => {
    expect(formatIgnitionLockMessage("auth_failure", "Token expired")).toBe("Token expired");
    expect(formatIgnitionLockMessage("missing_key")).toContain("No valid API key");
  });
});
