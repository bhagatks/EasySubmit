/** Logical page sizes for resume preview pagination (mm). Default export path: A4. */

export type PageSizeId =
  | "a4"
  | "letter"
  | "legal"
  | "tabloid"
  | "a3"
  | "a5"
  | "b5"
  | "executive"
  | "ledger";

export type PageSizeSpec = {
  id: PageSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
};

export const DEFAULT_PAGE_SIZE_ID: PageSizeId = "a4";

export const PAGE_SIZE_STORAGE_KEY = "easysubmit-page-size-v1";

/** Common print sizes — A4 first (default). */
export const PAGE_SIZES: PageSizeSpec[] = [
  { id: "a4", label: "A4 (210 × 297 mm)", widthMm: 210, heightMm: 297 },
  { id: "letter", label: 'US Letter (8.5 × 11")', widthMm: 215.9, heightMm: 279.4 },
  { id: "legal", label: 'US Legal (8.5 × 14")', widthMm: 215.9, heightMm: 355.6 },
  { id: "tabloid", label: 'Tabloid (11 × 17")', widthMm: 279.4, heightMm: 431.8 },
  { id: "a3", label: "A3 (297 × 420 mm)", widthMm: 297, heightMm: 420 },
  { id: "a5", label: "A5 (148 × 210 mm)", widthMm: 148, heightMm: 210 },
  { id: "b5", label: "B5 (176 × 250 mm)", widthMm: 176, heightMm: 250 },
  { id: "executive", label: 'Executive (7.25 × 10.5")', widthMm: 184.15, heightMm: 266.7 },
  { id: "ledger", label: 'Ledger (17 × 11")', widthMm: 431.8, heightMm: 279.4 },
];

export function getPageSizeSpec(id: PageSizeId): PageSizeSpec {
  return PAGE_SIZES.find((size) => size.id === id) ?? PAGE_SIZES[0];
}

/** Preview page width in px; height follows aspect ratio. */
export function pageDimensionsPx(
  id: PageSizeId,
  pageWidthPx: number,
): { widthPx: number; heightPx: number } {
  const spec = getPageSizeSpec(id);
  const heightPx = (pageWidthPx * spec.heightMm) / spec.widthMm;
  return { widthPx: pageWidthPx, heightPx };
}

export function pageCountForContent(contentHeightPx: number, pageHeightPx: number): number {
  if (pageHeightPx <= 0) return 1;
  return Math.max(1, Math.ceil(contentHeightPx / pageHeightPx));
}

/** Scale so the full paginated stack fits inside the viewport. */
export function computeFitScale(
  stackWidthPx: number,
  stackHeightPx: number,
  viewportWidthPx: number,
  viewportHeightPx: number,
  paddingPx = 24,
): number {
  const availableW = Math.max(1, viewportWidthPx - paddingPx * 2);
  const availableH = Math.max(1, viewportHeightPx - paddingPx * 2);
  const scaleW = availableW / stackWidthPx;
  const scaleH = availableH / stackHeightPx;
  return Math.min(1, scaleW, scaleH);
}

export function readStoredPageSizeId(): PageSizeId {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE_ID;
  const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
  if (raw && PAGE_SIZES.some((size) => size.id === raw)) {
    return raw as PageSizeId;
  }
  return DEFAULT_PAGE_SIZE_ID;
}

export function writeStoredPageSizeId(id: PageSizeId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, id);
}
