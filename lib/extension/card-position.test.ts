import { describe, expect, it } from "vitest";
import {
  JOB_CARD_EDGE_MARGIN,
  JOB_CARD_PANEL_MAX_WIDTH,
  JOB_CARD_PANEL_MAX_HEIGHT_CAP,
  JOB_CARD_PANEL_MIN_HEIGHT,
  JOB_CARD_TOP_OFFSET,
  JOB_CARD_WIDTH,
  clampCardPanelHeight,
  clampCardPanelWidth,
  defaultCardPanelBodyMaxHeight,
  getDefaultFixedCardPosition,
  normalizeStoredCardPosition,
  syncCardPositionForHostWidth,
} from "@/src/shared/extension/card-position";

describe("getDefaultFixedCardPosition", () => {
  it("anchors the card to the upper-right by default", () => {
    const viewportWidth = 1440;
    const position = getDefaultFixedCardPosition(viewportWidth);

    expect(position.mode).toBe("fixed");
    expect(position.y).toBe(JOB_CARD_TOP_OFFSET);
    expect(position.x).toBe(viewportWidth - JOB_CARD_WIDTH - JOB_CARD_EDGE_MARGIN);
  });
});

describe("normalizeStoredCardPosition", () => {
  it("migrates legacy inline saves to the default right anchor", () => {
    expect(normalizeStoredCardPosition({ mode: "inline" }, 1200)).toEqual(
      getDefaultFixedCardPosition(1200),
    );
  });

  it("preserves a custom dragged position", () => {
    const saved = { mode: "fixed" as const, x: 40, y: 120, custom: true };
    expect(normalizeStoredCardPosition(saved, 1200)).toEqual(saved);
  });
});

describe("clampCardPanelWidth", () => {
  it("clamps panel resize width between default and max", () => {
    expect(clampCardPanelWidth(200)).toBe(JOB_CARD_WIDTH);
    expect(clampCardPanelWidth(420)).toBe(420);
    expect(clampCardPanelWidth(900)).toBe(JOB_CARD_PANEL_MAX_WIDTH);
  });
});

describe("clampCardPanelHeight", () => {
  it("clamps panel body height within viewport bounds", () => {
    expect(clampCardPanelHeight(120, 900)).toBe(JOB_CARD_PANEL_MIN_HEIGHT);
    expect(clampCardPanelHeight(400, 900)).toBe(400);
    expect(clampCardPanelHeight(900, 900)).toBe(Math.min(810, JOB_CARD_PANEL_MAX_HEIGHT_CAP));
  });

  it("defaults panel max height to 70vh capped at 520", () => {
    expect(defaultCardPanelBodyMaxHeight(1000)).toBe(520);
    expect(defaultCardPanelBodyMaxHeight(600)).toBe(420);
  });
});

describe("syncCardPositionForHostWidth", () => {
  it("preserves a free-dragged position when panel width changes", () => {
    const dragged = {
      mode: "fixed" as const,
      x: 120,
      y: 240,
      custom: true,
      anchorRight: false,
    };
    expect(syncCardPositionForHostWidth(dragged, 320, 560, 1440, 900)).toEqual(
      expect.objectContaining({ x: 120, y: 240, custom: true, anchorRight: false }),
    );
  });

  it("keeps the right edge when a resized panel narrows", () => {
    const viewportWidth = 1440;
    const wideWidth = 560;
    const narrowWidth = JOB_CARD_WIDTH;
    const resized = {
      mode: "fixed" as const,
      x: viewportWidth - JOB_CARD_EDGE_MARGIN - wideWidth,
      y: 200,
      custom: true,
      anchorRight: true,
    };
    const synced = syncCardPositionForHostWidth(
      resized,
      narrowWidth,
      wideWidth,
      viewportWidth,
      900,
    );
    expect(synced.x).toBe(viewportWidth - JOB_CARD_EDGE_MARGIN - narrowWidth);
    expect(synced.y).toBe(200);
    expect(synced.anchorRight).toBe(true);
  });

  it("re-anchors non-custom positions to the upper-right", () => {
    const stale = {
      mode: "fixed" as const,
      x: 400,
      y: 180,
    };
    expect(syncCardPositionForHostWidth(stale, JOB_CARD_WIDTH, 560, 1440, 900)).toEqual({
      mode: "fixed",
      x: 1440 - JOB_CARD_WIDTH - JOB_CARD_EDGE_MARGIN,
      y: 180,
    });
  });
});
