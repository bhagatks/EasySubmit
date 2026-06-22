export const JOB_CARD_WIDTH = 320;
export const JOB_CARD_COLLAPSED_SIZE = 52;
/** Distance from the viewport edge used for the default left-side anchor. */
export const JOB_CARD_EDGE_MARGIN = 20;
/** @deprecated Use JOB_CARD_EDGE_MARGIN — kept for callers that referenced the old name. */
export const JOB_CARD_RIGHT_MARGIN = JOB_CARD_EDGE_MARGIN;
export const JOB_CARD_TOP_OFFSET = 88;

export type FixedCardPosition = {
  mode: "fixed";
  x: number;
  y: number;
  /** Set after the user drags on this page; cleared on refresh. */
  custom?: boolean;
};

/** Collapsed launcher anchor — upper-left by default (Simplify stays on the right). */
export function getCollapsedFixedCardPosition(
  _viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  y = JOB_CARD_TOP_OFFSET,
): FixedCardPosition {
  return {
    mode: "fixed",
    x: JOB_CARD_EDGE_MARGIN,
    y,
    custom: false,
  };
}

/** Default overlay: fixed to the upper-left so it can sit beside Simplify on the right. */
export function getDefaultFixedCardPosition(
  _viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
): FixedCardPosition {
  return {
    mode: "fixed",
    x: JOB_CARD_EDGE_MARGIN,
    y: JOB_CARD_TOP_OFFSET,
  };
}

export function clampFixedCardPosition(
  position: FixedCardPosition,
  hostWidth = JOB_CARD_WIDTH,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): FixedCardPosition {
  return {
    ...position,
    x: Math.max(8, Math.min(position.x, viewportWidth - hostWidth - 8)),
    y: Math.max(8, Math.min(position.y, viewportHeight - Math.max(hostWidth, 80))),
  };
}

export function normalizeStoredCardPosition(
  stored: unknown,
  viewportWidth?: number,
): FixedCardPosition {
  if (
    stored &&
    typeof stored === "object" &&
    (stored as FixedCardPosition).mode === "fixed" &&
    typeof (stored as FixedCardPosition).x === "number" &&
    typeof (stored as FixedCardPosition).y === "number"
  ) {
    const saved = stored as FixedCardPosition;
    if (saved.custom) {
      return clampFixedCardPosition(saved, JOB_CARD_WIDTH, viewportWidth);
    }
  }

  return getDefaultFixedCardPosition(viewportWidth);
}
