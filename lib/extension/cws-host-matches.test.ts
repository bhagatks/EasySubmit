import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const matchesPath = resolve(process.cwd(), "extension/cws-host-matches.json");

function loadMatches(): string[] {
  const parsed = JSON.parse(readFileSync(matchesPath, "utf8")) as { matches?: string[] };
  return parsed.matches ?? [];
}

describe("cws-host-matches.json", () => {
  it("defines scoped HTTPS patterns (no broad https://*/*)", () => {
    const matches = loadMatches();
    expect(matches.length).toBeGreaterThan(10);
    expect(matches).not.toContain("https://*/*");
    expect(matches).not.toContain("http://*/*");
    expect(matches.every((m) => m.startsWith("https://"))).toBe(true);
  });

  it("includes major ATS and job-board hosts", () => {
    const matches = loadMatches();
    expect(matches.some((m) => m.includes("linkedin.com"))).toBe(true);
    expect(matches.some((m) => m.includes("greenhouse.io"))).toBe(true);
    expect(matches.some((m) => m.includes("myworkdayjobs.com"))).toBe(true);
  });

  it("does not use any-host path wildcards (CWS broad permission warning)", () => {
    const matches = loadMatches();
    expect(matches.some((m) => /^https:\/\/\*\//.test(m))).toBe(false);
    expect(matches.some((m) => m === "https://*/*")).toBe(false);
  });
});
