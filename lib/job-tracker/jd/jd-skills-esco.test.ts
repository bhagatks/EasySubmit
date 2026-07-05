import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEscoSkillSearchUrl,
  enrichJdSkillsWithEsco,
  escoSearchHitLabel,
  isEscoSearchPhrase,
  isEscoSkillRelevant,
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

describe("isEscoSearchPhrase", () => {
  it("rejects generic HR / company tokens", () => {
    expect(isEscoSearchPhrase("fidelity")).toBe(false);
    expect(isEscoSearchPhrase("provide")).toBe(false);
    expect(isEscoSearchPhrase("immigration")).toBe(false);
    expect(isEscoSearchPhrase("request")).toBe(false);
  });

  it("accepts taxonomy-backed single tokens", () => {
    expect(isEscoSearchPhrase("kubernetes")).toBe(true);
    expect(isEscoSearchPhrase("python")).toBe(true);
  });

  it("accepts skill-like bigrams", () => {
    expect(isEscoSearchPhrase("machine learning")).toBe(true);
    expect(isEscoSearchPhrase("data architecture")).toBe(true);
  });

  it("rejects immigration and sponsorship HR boilerplate phrases", () => {
    expect(isEscoSearchPhrase("provide immigration advice")).toBe(false);
    expect(isEscoSearchPhrase("obtain sponsorship")).toBe(false);
    expect(isEscoSearchPhrase("write job descriptions")).toBe(false);
    expect(isEscoSkillRelevant("immigration sponsorship", "provide immigration advice")).toBe(
      false,
    );
  });
});

describe("isEscoSkillRelevant", () => {
  it("rejects unrelated occupation skills for generic queries", () => {
    expect(isEscoSkillRelevant("fidelity", "record music")).toBe(false);
    expect(isEscoSkillRelevant("provide", "provide domiciliary eyecare")).toBe(false);
    expect(isEscoSkillRelevant("immigration", "apply immigration law")).toBe(false);
    expect(isEscoSkillRelevant("data architecture", "apply immigration law")).toBe(false);
  });

  it("accepts hits that overlap with the query phrase", () => {
    expect(isEscoSkillRelevant("machine learning", "machine learning")).toBe(true);
    expect(isEscoSkillRelevant("kubernetes", "Kubernetes")).toBe(true);
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

  it("does not search generic company tokens", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const enriched = await enrichJdSkillsWithEsco(["fidelity"], []);
    expect(enriched).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects hits with no token overlap with query phrase", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          _embedded: {
            results: [
              {
                uri: "http://data.europa.eu/esco/skill/immigration",
                preferredLabel: { en: "apply immigration law" },
              },
            ],
          },
        }),
      ),
    );

    const enriched = await enrichJdSkillsWithEsco(["data architecture"], []);
    expect(enriched).toHaveLength(0);
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
