export const JOB_CARD_WIDTH = 320;
export const JOB_CARD_PANEL_MAX_WIDTH = 560;
export const JOB_CARD_PANEL_MIN_HEIGHT = 200;
export const JOB_CARD_PANEL_DEFAULT_MAX_HEIGHT = 520;
export const JOB_CARD_PANEL_MAX_HEIGHT_CAP = 720;
export const JOB_CARD_COLLAPSED_SIZE = 64;
/** Distance from the viewport edge used for the default right-side anchor. */
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
  /** Panel resize keeps the right edge fixed when width changes. Grip drag does not. */
  anchorRight?: boolean;
};

function anchorRightX(
  viewportWidth: number,
  hostWidth: number,
): number {
  return Math.max(8, viewportWidth - hostWidth - JOB_CARD_EDGE_MARGIN);
}

/** Collapsed launcher anchor — upper-right by default. */
export function getCollapsedFixedCardPosition(
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  y = JOB_CARD_TOP_OFFSET,
): FixedCardPosition {
  return {
    mode: "fixed",
    x: anchorRightX(viewportWidth, JOB_CARD_COLLAPSED_SIZE),
    y,
    custom: false,
  };
}

export function clampCardPanelWidth(
  width: number,
  minWidth = JOB_CARD_WIDTH,
  maxWidth = JOB_CARD_PANEL_MAX_WIDTH,
): number {
  return Math.max(minWidth, Math.min(width, maxWidth));
}

export function defaultCardPanelBodyMaxHeight(
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): number {
  return Math.min(viewportHeight * 0.7, JOB_CARD_PANEL_DEFAULT_MAX_HEIGHT);
}

export function clampCardPanelHeight(
  height: number,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): number {
  const max = Math.min(viewportHeight * 0.9, JOB_CARD_PANEL_MAX_HEIGHT_CAP);
  return Math.max(JOB_CARD_PANEL_MIN_HEIGHT, Math.min(height, max));
}

/** Default overlay: fixed to the upper-right. */
export function getDefaultFixedCardPosition(
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  hostWidth = JOB_CARD_WIDTH,
  y = JOB_CARD_TOP_OFFSET,
): FixedCardPosition {
  return {
    mode: "fixed",
    x: anchorRightX(viewportWidth, hostWidth),
    y,
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

export function syncCardPositionForHostWidth(
  position: FixedCardPosition,
  nextHostWidth: number,
  previousHostWidth?: number,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800,
): FixedCardPosition {
  if (position.custom && position.anchorRight && previousHostWidth != null) {
    const rightEdge = position.x + previousHostWidth;
    return clampFixedCardPosition(
      {
        ...position,
        x: rightEdge - nextHostWidth,
        anchorRight: true,
      },
      nextHostWidth,
      viewportWidth,
      viewportHeight,
    );
  }

  if (position.custom) {
    return clampFixedCardPosition(position, nextHostWidth, viewportWidth, viewportHeight);
  }

  return getDefaultFixedCardPosition(viewportWidth, nextHostWidth, position.y);
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
