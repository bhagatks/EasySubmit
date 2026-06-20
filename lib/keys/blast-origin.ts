export type IgnitionBlastOrigin = {
  x: number;
  y: number;
};

/** Resolve bloom origin (% of chamber) from a power-cell element. */
export function resolveBlastOriginFromCell(
  chamberEl: HTMLElement | null,
  cellEl: HTMLElement | null,
): IgnitionBlastOrigin {
  if (!chamberEl || !cellEl) {
    return { x: 82, y: 50 };
  }

  const chamber = chamberEl.getBoundingClientRect();
  const cell = cellEl.getBoundingClientRect();
  const x = ((cell.left + cell.width / 2 - chamber.left) / chamber.width) * 100;
  const y = ((cell.top + cell.height / 2 - chamber.top) / chamber.height) * 100;

  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}
