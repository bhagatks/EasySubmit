import { describe, expect, it } from "vitest";
import type { ExternalApiDebugExchange } from "@/lib/extension/external-api-debug";
import {
  resolveOnetVocabularyPipelineOutcome,
  type OnetRoleVocabulary,
} from "@/lib/job-tracker/ats/onet-service";

function vocab(overrides: Partial<OnetRoleVocabulary>): OnetRoleVocabulary {
  return {
    matchedTitle: "Software Engineer",
    onetCode: "15-1252.00",
    skills: ["Programming"],
    tools: ["Git"],
    source: "api",
    ...overrides,
  };
}

describe("resolveOnetVocabularyPipelineOutcome", () => {
  it("marks api and cache hits as done", () => {
    expect(resolveOnetVocabularyPipelineOutcome(vocab({ source: "api" }))).toEqual({
      status: "done",
      detail: "Software Engineer",
    });
    expect(resolveOnetVocabularyPipelineOutcome(vocab({ source: "cache" }))).toEqual({
      status: "done",
      detail: "Software Engineer",
    });
  });

  it("marks fallback with 401 as warning with auth detail", () => {
    const prior = process.env.ONET_API_KEY;
    process.env.ONET_API_KEY = "test-key";
    const apiDebug: ExternalApiDebugExchange[] = [
      {
        label: "Occupation search",
        request: { method: "GET", url: "https://example.test/search" },
        response: { status: 401, ok: false },
      },
    ];

    try {
      expect(
        resolveOnetVocabularyPipelineOutcome(
          vocab({ source: "fallback", onetCode: "", skills: [], tools: [] }),
          apiDebug,
        ),
      ).toEqual({
        status: "warning",
        detail: "O*NET auth failed (401) — check ONET_API_KEY",
      });
    } finally {
      if (prior !== undefined) process.env.ONET_API_KEY = prior;
      else delete process.env.ONET_API_KEY;
    }
  });

  it("marks fallback without API key as warning", () => {
    const prior = process.env.ONET_API_KEY;
    delete process.env.ONET_API_KEY;
    try {
      expect(
        resolveOnetVocabularyPipelineOutcome(
          vocab({ source: "fallback", onetCode: "", skills: [], tools: [] }),
        ),
      ).toEqual({
        status: "warning",
        detail: "O*NET API key not configured (ONET_API_KEY)",
      });
    } finally {
      if (prior !== undefined) process.env.ONET_API_KEY = prior;
    }
  });

  it("marks fallback without HTTP error as no-match warning", () => {
    const prior = process.env.ONET_API_KEY;
    process.env.ONET_API_KEY = "test-key";
    try {
      expect(
        resolveOnetVocabularyPipelineOutcome(
          vocab({
            source: "fallback",
            onetCode: "",
            skills: [],
            tools: [],
            matchedTitle: "Director, AI/ML and Data Architecture",
          }),
        ),
      ).toEqual({
        status: "warning",
        detail: 'No O*NET occupation match for "Director, AI/ML and Data Architecture"',
      });
    } finally {
      if (prior !== undefined) process.env.ONET_API_KEY = prior;
      else delete process.env.ONET_API_KEY;
    }
  });
});
