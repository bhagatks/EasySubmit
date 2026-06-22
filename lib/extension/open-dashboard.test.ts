import { describe, expect, it } from "vitest";
import {
  appOriginsMatch,
  buildDashboardUrl,
  expandAppOriginAliases,
  isAppDashboardUrl,
  isAppOriginUrl,
  pickAppTabToReuse,
} from "@/src/shared/extension/open-dashboard";

describe("open-dashboard", () => {
  const origin = "https://easysubmit.ai";

  it("builds dashboard URLs from app base + path", () => {
    expect(buildDashboardUrl("https://easysubmit.ai", "/dashboard/job-tracker")).toBe(
      "https://easysubmit.ai/dashboard/job-tracker",
    );
  });

  it("matches www and non-www origins", () => {
    expect(appOriginsMatch("https://www.easysubmit.ai", "https://easysubmit.ai")).toBe(true);
    expect(isAppOriginUrl("https://www.easysubmit.ai/dashboard", origin)).toBe(true);
    expect(isAppDashboardUrl("https://www.easysubmit.ai/dashboard/job-tracker", origin)).toBe(
      true,
    );
  });

  it("matches localhost and 127.0.0.1", () => {
    expect(appOriginsMatch("http://127.0.0.1:3000", "http://localhost:3000")).toBe(true);
    expect(
      pickAppTabToReuse(
        [{ id: 1, url: "http://127.0.0.1:3000/dashboard/job-tracker" }],
        "http://localhost:3000",
      )?.id,
    ).toBe(1);
  });

  it("expands origin aliases for tab queries", () => {
    const aliases = expandAppOriginAliases("http://localhost:3000");
    expect(aliases).toContain("http://localhost:3000");
    expect(aliases).toContain("http://127.0.0.1:3000");
  });

  it("prefers an existing dashboard tab over other app tabs", () => {
    const picked = pickAppTabToReuse(
      [
        { id: 1, url: "https://easysubmit.ai/login" },
        { id: 2, url: "https://easysubmit.ai/dashboard/settings" },
        { id: 3, url: "https://example.com/dashboard/job-tracker" },
      ],
      origin,
    );

    expect(picked?.id).toBe(2);
    expect(isAppDashboardUrl(picked!.url, origin)).toBe(true);
  });

  it("falls back to any app tab when dashboard is not open", () => {
    const picked = pickAppTabToReuse(
      [{ id: 1, url: "https://easysubmit.ai/login" }],
      origin,
    );
    expect(picked?.id).toBe(1);
  });
});
