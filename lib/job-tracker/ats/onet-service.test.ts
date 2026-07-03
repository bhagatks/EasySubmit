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
    const apiDebug: ExternalApiDebugExchange[] = [
      {
        label: "Occupation search",
        request: { method: "GET", url: "https://example.test/search" },
        response: { status: 401, ok: false },
      },
    ];

    expect(
      resolveOnetVocabularyPipelineOutcome(
        vocab({ source: "fallback", onetCode: "", skills: [], tools: [] }),
        apiDebug,
      ),
    ).toEqual({
      status: "warning",
      detail: "O*NET auth failed (401) — credentials required",
    });
  });

  it("marks fallback without HTTP error as no-match warning", () => {
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
  });
});
