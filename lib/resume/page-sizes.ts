/** Logical page sizes for resume preview pagination (mm). ATS-safe: US Letter + A4 only. */

export type PageSizeId = "a4" | "letter";

export type PageSizeSpec = {
  id: PageSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
};

/** US Letter — canonical ATS page size (EASYSUBMIT_RESUME_RULES §1). */
export const DEFAULT_PAGE_SIZE_ID: PageSizeId = "letter";

export const PAGE_SIZE_STORAGE_KEY = "easysubmit-page-size-v1";

/** ATS-standard print sizes — US Letter first (default). */
export const PAGE_SIZES: PageSizeSpec[] = [
  { id: "letter", label: 'US Letter (8.5 × 11")', widthMm: 215.9, heightMm: 279.4 },
  { id: "a4", label: "A4 (210 × 297 mm)", widthMm: 210, heightMm: 297 },
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
  if (
    stackWidthPx <= 0 ||
    stackHeightPx <= 0 ||
    viewportWidthPx <= 0 ||
    viewportHeightPx <= 0
  ) {
    return 1;
  }

  const availableW = viewportWidthPx - paddingPx * 2;
  const availableH = viewportHeightPx - paddingPx * 2;
  if (availableW <= 0 || availableH <= 0) {
    return 1;
  }

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
