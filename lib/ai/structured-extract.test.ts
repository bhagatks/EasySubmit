import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  isStructuredExtractParseError,
  parseJsonObjectFromModelText,
} from "@/src/lib/ai/engine/structured-extract";

describe("structured-extract helpers", () => {
  it("detects AI SDK parse failures", () => {
    expect(
      isStructuredExtractParseError(new Error("No object generated: could not parse the response.")),
    ).toBe(true);
    expect(isStructuredExtractParseError(new Error("429 rate limit"))).toBe(false);
  });

  it("parses JSON from fenced model text", () => {
    const raw = parseJsonObjectFromModelText(
      'Here is the result:\n```json\n{"mustHaveSkills":["ISO 13485"],"summaryTheme":"Procurement lead"}\n```',
    );
    expect(raw).toEqual({
      mustHaveSkills: ["ISO 13485"],
      summaryTheme: "Procurement lead",
    });
  });

  it("parses bare JSON object", () => {
    const schema = z.object({ ok: z.boolean() });
    const raw = parseJsonObjectFromModelText('{"ok":true}');
    expect(schema.parse(raw)).toEqual({ ok: true });
  });
});
