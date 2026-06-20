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
});

describe("getInitials", () => {
  it("uses first and last initials when provided", () => {
    expect(getInitials("Alex", "Rivera", "alex@example.com")).toBe("AR");
  });

  it("falls back to legacy full name initials", () => {
    expect(getInitials(null, null, "alex@example.com", "Alex Rivera")).toBe("AR");
  });

  it("falls back to email prefix", () => {
    expect(getInitials(null, null, "alex@example.com")).toBe("AL");
  });
});
