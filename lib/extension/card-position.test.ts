import { describe, expect, it } from "vitest";
import {
  JOB_CARD_EDGE_MARGIN,
  JOB_CARD_TOP_OFFSET,
  JOB_CARD_WIDTH,
  getDefaultFixedCardPosition,
  normalizeStoredCardPosition,
} from "@/src/shared/extension/card-position";

describe("getDefaultFixedCardPosition", () => {
  it("anchors the card to the upper-left by default", () => {
    const position = getDefaultFixedCardPosition(1440);

    expect(position.mode).toBe("fixed");
    expect(position.y).toBe(JOB_CARD_TOP_OFFSET);
    expect(position.x).toBe(JOB_CARD_EDGE_MARGIN);
  });
});

describe("normalizeStoredCardPosition", () => {
  it("migrates legacy inline saves to the default left anchor", () => {
    expect(normalizeStoredCardPosition({ mode: "inline" }, 1200)).toEqual(
      getDefaultFixedCardPosition(1200),
    );
  });

  it("preserves a custom dragged position", () => {
    const saved = { mode: "fixed" as const, x: 40, y: 120, custom: true };
    expect(normalizeStoredCardPosition(saved, 1200)).toEqual(saved);
  });
});
