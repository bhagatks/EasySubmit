import { describe, expect, it } from "vitest";
import {
  LEGAL_DOCUMENTS_DEFAULTS,
  parseLegalDocumentsConfig,
} from "@/src/lib/services/legal-documents-config";

describe("parseLegalDocumentsConfig", () => {
  it("returns bundled defaults when value is missing or invalid", () => {
    expect(parseLegalDocumentsConfig(null)).toEqual(LEGAL_DOCUMENTS_DEFAULTS);
    expect(parseLegalDocumentsConfig({})).toEqual(LEGAL_DOCUMENTS_DEFAULTS);
  });

  it("parses valid partial overrides with fallback blocks", () => {
    const parsed = parseLegalDocumentsConfig({
      terms: {
        title: "Custom Terms",
        updatedLabel: "Last updated Jan 1, 2027",
        blocks: [{ kind: "p", inlines: [{ kind: "text", value: "Hello." }] }],
      },
    });

    expect(parsed.terms.title).toBe("Custom Terms");
    expect(parsed.terms.updatedLabel).toBe("Last updated Jan 1, 2027");
    expect(parsed.terms.blocks).toHaveLength(1);
    expect(parsed.privacy).toEqual(LEGAL_DOCUMENTS_DEFAULTS.privacy);
  });

  it("falls back when blocks are malformed", () => {
    const parsed = parseLegalDocumentsConfig({
      terms: {
        title: "Bad Terms",
        updatedLabel: "Last updated",
        blocks: [{ kind: "p", inlines: [{ kind: "unknown" }] }],
      },
    });

    expect(parsed.terms).toEqual(LEGAL_DOCUMENTS_DEFAULTS.terms);
  });
});
