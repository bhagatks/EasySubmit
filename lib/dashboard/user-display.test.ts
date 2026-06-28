import { describe, expect, it } from "vitest";
import { getDisplayName, getInitials } from "@/lib/dashboard/user-display";

describe("getDisplayName", () => {
  it("uses firstName when provided", () => {
    expect(getDisplayName("Alex", "alex@example.com")).toBe("Alex");
  });

  it("falls back to legacy full name", () => {
    expect(getDisplayName(null, "alex@example.com", "Alex Rivera")).toBe("Alex");
  });

  it("falls back to the email local part", () => {
    expect(getDisplayName(null, "alex@example.com")).toBe("alex");
  });

  it("returns 'there' when all inputs are null", () => {
    expect(getDisplayName(null, null, null)).toBe("there");
  });

  it("trims whitespace from firstName", () => {
    expect(getDisplayName("  Alex  ", "alex@example.com")).toBe("Alex");
  });
});

describe("getInitials", () => {
  it("uses first and last initials when provided", () => {
    expect(getInitials("Alex", "Rivera", "alex@example.com")).toBe("AR");
  });

  it("uses first two chars of given name when no last name", () => {
    expect(getInitials("Alex", null, "alex@example.com")).toBe("AL");
  });

  it("falls back to legacy full name initials", () => {
    expect(getInitials(null, null, "alex@example.com", "Alex Rivera")).toBe("AR");
  });

  it("falls back to single-word legacy name", () => {
    expect(getInitials(null, null, "alex@example.com", "Alex")).toBe("AL");
  });

  it("falls back to email prefix", () => {
    expect(getInitials(null, null, "alex@example.com")).toBe("AL");
  });

  it("returns ES when all inputs are null", () => {
    expect(getInitials(null, null, null, null)).toBe("ES");
  });
});
