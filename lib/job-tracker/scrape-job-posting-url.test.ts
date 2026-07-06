import { describe, expect, it, vi } from "vitest";
import {
  assertPublicJobPostingUrl,
  htmlToPlainJobText,
  normalizeJobPostingUrl,
  scrapeJobPostingFromUrl,
} from "@/lib/job-tracker/scrape-job-posting-url";

describe("normalizeJobPostingUrl", () => {
  it("adds https when missing", () => {
    expect(normalizeJobPostingUrl("boards.greenhouse.io/acme/jobs/123")).toBe(
      "https://boards.greenhouse.io/acme/jobs/123",
    );
  });

  it("rejects invalid urls", () => {
    expect(normalizeJobPostingUrl("not a url")).toBeNull();
  });
});

describe("assertPublicJobPostingUrl", () => {
  it("blocks localhost", () => {
    expect(assertPublicJobPostingUrl("http://localhost/jobs/1")?.code).toBe("blocked_url");
  });
});

describe("htmlToPlainJobText", () => {
  it("strips tags and decodes entities", () => {
    expect(htmlToPlainJobText("<p>Hello&nbsp;<strong>world</strong></p>")).toBe("Hello world");
  });
});

describe("scrapeJobPostingFromUrl", () => {
  it("imports Greenhouse board jobs via boards-api", async () => {
    const fetchImpl = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("boards-api.greenhouse.io")) {
        return new Response(
          JSON.stringify({
            title: "Software Engineer",
            content: "<p>Build APIs</p>".repeat(40),
            location: { name: "Remote" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await scrapeJobPostingFromUrl(
      "https://boards.greenhouse.io/acme/jobs/123456",
      { fetchImpl },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.title).toBe("Software Engineer");
    expect(result.description.length).toBeGreaterThanOrEqual(120);
    expect(result.platform).toBe("greenhouse");
  });

  it("parses JSON-LD JobPosting from fetched HTML", async () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">${JSON.stringify({
        "@type": "JobPosting",
        title: "Director, Procurement",
        description: "Lead procurement strategy. ".repeat(20),
        hiringOrganization: { name: "iRhythm" },
      })}</script>
    </head><body></body></html>`;

    const fetchImpl = vi.fn(async () =>
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const result = await scrapeJobPostingFromUrl("https://careers.example.com/jobs/abc", {
      fetchImpl,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.title).toBe("Director, Procurement");
    expect(result.company).toBeTruthy();
    expect(result.description.length).toBeGreaterThanOrEqual(120);
  });
});
