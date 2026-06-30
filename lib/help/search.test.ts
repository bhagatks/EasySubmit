import { describe, expect, it } from "vitest";
import {
  HELP_CATEGORIES_BY_ID,
  getAllHelpArticles,
} from "@/lib/help/content";
import { searchHelpArticles } from "@/lib/help/search";

describe("searchHelpArticles", () => {
  const articles = getAllHelpArticles();

  it("returns empty for blank query", () => {
    expect(searchHelpArticles(articles, HELP_CATEGORIES_BY_ID, "")).toEqual([]);
    expect(searchHelpArticles(articles, HELP_CATEGORIES_BY_ID, "   ")).toEqual([]);
  });

  it("matches article titles", () => {
    const results = searchHelpArticles(articles, HELP_CATEGORIES_BY_ID, "BYOK");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.article.slug === "what-is-byok")).toBe(true);
  });

  it("matches summary text", () => {
    const results = searchHelpArticles(articles, HELP_CATEGORIES_BY_ID, "midnight UTC");
    expect(results.some((r) => r.article.slug === "free-plan-and-limits")).toBe(true);
  });

  it("respects limit", () => {
    const results = searchHelpArticles(articles, HELP_CATEGORIES_BY_ID, "resume", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
