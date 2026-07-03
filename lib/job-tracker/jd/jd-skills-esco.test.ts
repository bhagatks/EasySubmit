import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEscoSkillSearchUrl,
  enrichJdSkillsWithEsco,
  escoSearchHitLabel,
  jdSkillFromEscoSearchHit,
} from "@/lib/job-tracker/jd/jd-skills-esco";

describe("buildEscoSkillSearchUrl", () => {
  it("targets /search with skill type filter", () => {
    const url = buildEscoSkillSearchUrl(
      "https://ec.europa.eu/esco/api",
      "machine learning",
    );
    expect(url).toBe(
      "https://ec.europa.eu/esco/api/search?text=machine+learning&language=en&type=skill&limit=1",
    );
  });

  it("strips trailing slash from base", () => {
    const url = buildEscoSkillSearchUrl(
      "https://ec.europa.eu/esco/api/",
      "python",
    );
    expect(url.startsWith("https://ec.europa.eu/esco/api/search?")).toBe(true);
  });
});

describe("escoSearchHitLabel", () => {
  it("prefers preferredLabel.en over title", () => {
    expect(
      escoSearchHitLabel(
        {
          title: "data mining",
          preferredLabel: { en: "Python (computer programming)" },
        },
        "python",
      ),
    ).toBe("Python (computer programming)");
  });

  it("falls back to en-us then title", () => {
    expect(
      escoSearchHitLabel(
        { title: "data mining", preferredLabel: { "en-us": "Python" } },
        "python",
      ),
    ).toBe("Python");
    expect(escoSearchHitLabel({ title: "data mining" }, "fallback")).toBe(
      "data mining",
    );
  });
});

describe("enrichJdSkillsWithEsco apiDebug", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ESCO_API_ENABLED;
  });

  it("records external request/response exchanges", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          _embedded: {
            results: [
              {
                uri: "http://data.europa.eu/esco/skill/example",
                title: "kubernetes",
                preferredLabel: { en: "Kubernetes" },
              },
            ],
          },
        }),
      ),
    );

    const apiDebug: Array<{
      label: string;
      request: { method: string; url: string };
      response: { status: number | null; ok: boolean; body?: unknown; error?: string };
    }> = [];

    const enriched = await enrichJdSkillsWithEsco(["kubernetes"], [], { apiDebug });

    expect(enriched).toHaveLength(1);
    expect(apiDebug).toHaveLength(1);
    expect(apiDebug[0]?.request.method).toBe("GET");
    expect(apiDebug[0]?.request.url).toContain("/search?");
    expect(apiDebug[0]?.response.ok).toBe(true);
  });
});

describe("jdSkillFromEscoSearchHit", () => {
  it("maps search hit to JdSkillEntry", () => {
    const entry = jdSkillFromEscoSearchHit(
      {
        uri: "http://data.europa.eu/esco/skill/example",
        title: "data mining",
        preferredLabel: { en: "machine learning" },
      },
      "machine learning",
    );
    expect(entry).toMatchObject({
      label: "Machine Learning",
      source: "esco",
      escoUri: "http://data.europa.eu/esco/skill/example",
    });
  });
});
