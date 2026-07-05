import { describe, expect, it, vi } from "vitest";
import {
  buildGreenhouseBoardJobApiUrl,
  deriveGreenhouseBoardSlugCandidates,
  fetchGreenhouseEmbeddedJobData,
  fetchGreenhouseJobFromPageUrl,
  parseGreenhouseBoardSlugFromUrl,
  parseGreenhouseBoardApiJob,
  preferGreenhouseBoardApiDescription,
} from "@/src/shared/extension/greenhouse-board-fetch";

const SUVODA_JOB =
  "https://www.suvoda.com/careers/job-openings?gh_jid=8521135002";

const SAMPLE_API_PAYLOAD = {
  title: "Director, Software Engineering",
  content: "<p>Lead enterprise SaaS delivery across clinical trial platforms.</p>".repeat(8),
  location: { name: "Conshohocken, Pennsylvania" },
};

describe("deriveGreenhouseBoardSlugCandidates", () => {
  it("includes suvoda slug for embedded career URL", () => {
    expect(deriveGreenhouseBoardSlugCandidates(SUVODA_JOB)).toContain("suvoda");
  });

  it("derives slug from corporate apex domain", () => {
    expect(
      deriveGreenhouseBoardSlugCandidates(
        "https://www.acmecorp.com/careers?gh_jid=123456",
      ),
    ).toContain("acmecorp");
  });
});

describe("buildGreenhouseBoardJobApiUrl", () => {
  it("builds boards-api URL", () => {
    expect(buildGreenhouseBoardJobApiUrl("suvoda", "8521135002")).toBe(
      "https://boards-api.greenhouse.io/v1/boards/suvoda/jobs/8521135002",
    );
  });
});

describe("parseGreenhouseBoardApiJob", () => {
  it("parses title, html content, and location", () => {
    const parsed = parseGreenhouseBoardApiJob(SAMPLE_API_PAYLOAD);
    expect(parsed?.title).toBe("Director, Software Engineering");
    expect(parsed?.description.length).toBeGreaterThan(120);
    expect(parsed?.location).toBe("Conshohocken, Pennsylvania");
  });

  it("returns null when content is too short", () => {
    expect(parseGreenhouseBoardApiJob({ title: "Role", content: "short" })).toBeNull();
  });
});

describe("preferGreenhouseBoardApiDescription", () => {
  it("prefers API when DOM scrape is weak", () => {
    const dom = "Short role summary. ".repeat(8);
    const api = "Full greenhouse boards-api description. ".repeat(120);
    expect(preferGreenhouseBoardApiDescription(dom, api)?.trim()).toBe(api.trim());
  });

  it("keeps DOM when API is not materially better", () => {
    const dom = "x".repeat(2500);
    const api = "y".repeat(2600);
    expect(preferGreenhouseBoardApiDescription(dom, api)).toBe(api);
  });
});

describe("parseGreenhouseBoardSlugFromUrl", () => {
  it("parses native board job URL slug", () => {
    expect(
      parseGreenhouseBoardSlugFromUrl(
        "https://job-boards.greenhouse.io/hightouch/jobs/5727573004",
      ),
    ).toBe("hightouch");
  });
});

describe("fetchGreenhouseJobFromPageUrl", () => {
  it("fetches native board URL via boards-api", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (href.includes("/boards/hightouch/jobs/5727573004")) {
        return Response.json(SAMPLE_API_PAYLOAD);
      }
      return new Response(null, { status: 404 });
    });

    const data = await fetchGreenhouseJobFromPageUrl(
      "https://job-boards.greenhouse.io/hightouch/jobs/5727573004",
      { fetchImpl },
    );
    expect(data?.title).toBe("Director, Software Engineering");
    expect(data?.description?.length).toBeGreaterThan(120);
  });
});

describe("fetchGreenhouseEmbeddedJobData", () => {
  it("tries slug candidates until boards-api returns a job", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (href.includes("/boards/wrong/jobs/")) {
        return new Response(null, { status: 404 });
      }
      if (href.includes("/boards/suvoda/jobs/8521135002")) {
        return Response.json(SAMPLE_API_PAYLOAD);
      }
      return new Response(null, { status: 404 });
    });

    const data = await fetchGreenhouseEmbeddedJobData(SUVODA_JOB, { fetchImpl });
    expect(data?.platform).toBe("greenhouse");
    expect(data?.title).toBe("Director, Software Engineering");
    expect(data?.company).toBe("Suvoda");
    expect(data?.description?.length).toBeGreaterThan(120);
    expect(fetchImpl).toHaveBeenCalled();
  });
});
