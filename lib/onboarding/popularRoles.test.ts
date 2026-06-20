import { describe, expect, it } from "vitest";
import {
  fuzzyMatchScore,
  fuzzySearchPopularRoles,
  isExactPopularRole,
  POPULAR_ROLES,
} from "@/src/lib/constants/roles";

describe("fuzzySearchPopularRoles", () => {
  it("returns a slice of popular roles when query is empty", () => {
    expect(fuzzySearchPopularRoles("")).toEqual(POPULAR_ROLES.slice(0, 8));
  });

  it("ranks prefix and token matches ahead of weak matches", () => {
    const results = fuzzySearchPopularRoles("full stack");
    expect(results[0]).toBe("Full Stack Developer");
  });

  it("finds abbreviated engineer queries", () => {
    const results = fuzzySearchPopularRoles("ai eng");
    expect(results).toContain("AI Engineer");
  });

  it("matches shorthand department titles like Eng Man", () => {
    const results = fuzzySearchPopularRoles("Eng Man", 5);
    expect(results[0]).toBe("Engineering Manager");
  });

  it("returns no matches for unrelated input", () => {
    expect(fuzzySearchPopularRoles("zzzznotarole")).toEqual([]);
  });
});

describe("isExactPopularRole", () => {
  it("detects exact list matches case-insensitively", () => {
    expect(isExactPopularRole("product manager")).toBe(true);
    expect(isExactPopularRole("Chief Unicorn")).toBe(false);
  });
});

describe("fuzzyMatchScore", () => {
  it("scores exact matches highest", () => {
    expect(fuzzyMatchScore("Product Manager", "Product Manager")).toBe(1000);
    expect(fuzzyMatchScore("Product Manager", "Manager")).toBeGreaterThan(0);
    expect(fuzzyMatchScore("Product Manager", "xyz")).toBe(-1);
  });
});
