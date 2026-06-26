import { describe, expect, it } from "vitest";
import {
  coverDetailDraftsEqual,
  normalizeCoverDetailDraft,
} from "@/src/shared/extension/cover-detail-edit";

describe("cover-detail-edit", () => {
  it("normalizes body whitespace", () => {
    expect(normalizeCoverDetailDraft({ body: "  Hello\n\n" })).toEqual({ body: "Hello" });
  });

  it("compares drafts after normalization", () => {
    expect(coverDetailDraftsEqual({ body: "Hi" }, { body: " Hi " })).toBe(true);
    expect(coverDetailDraftsEqual({ body: "Hi" }, { body: "Bye" })).toBe(false);
  });
});
