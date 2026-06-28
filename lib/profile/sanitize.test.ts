import { describe, expect, it } from "vitest";
import {
  sanitizeEmail,
  sanitizeOptionalInt,
  sanitizeRequiredString,
  sanitizeString,
  sanitizeStringArray,
} from "@/lib/profile/sanitize";

describe("sanitize", () => {
  it("sanitizeString strips control chars and HTML", () => {
    expect(sanitizeString("  hello <b>world</b>  ")).toBe("hello world");
    expect(sanitizeString(123)).toBeNull();
    expect(sanitizeString("   ")).toBeNull();
  });

  it("sanitizeRequiredString defaults empty to blank", () => {
    expect(sanitizeRequiredString(null)).toBe("");
  });

  it("sanitizeEmail validates format", () => {
    expect(sanitizeEmail("Jane@Example.com")).toBe("jane@example.com");
    expect(sanitizeEmail("not-an-email")).toBeNull();
  });

  it("sanitizeStringArray dedupes case-insensitively", () => {
    expect(sanitizeStringArray(["Python", "python", "AWS"])).toEqual(["Python", "AWS"]);
    expect(sanitizeStringArray("not-array")).toEqual([]);
  });

  it("sanitizeOptionalInt clamps to range", () => {
    expect(sanitizeOptionalInt("42")).toBe(42);
    expect(sanitizeOptionalInt("abc")).toBeNull();
    expect(sanitizeOptionalInt(-1)).toBeNull();
    expect(sanitizeOptionalInt(null)).toBeNull();
  });
});
