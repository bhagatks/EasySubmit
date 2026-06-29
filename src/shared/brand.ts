/**
 * EasySubmit.ai brand — single source of truth for web app + extension.
 * Display: capital E + S only; suffix always lowercase `.ai`.
 */

export const EXTENSION_STORE_URL =
  "https://chromewebstore.google.com/detail/ask-gemini/daeaddalijienfjkhigbifmbdckbohjg";

export const BRAND = {
  name: "EasySubmit",
  suffix: ".ai",
  full: "EasySubmit.ai",
  tagline: "Apply smarter, not harder!",
  applyCta: "Apply with EasySubmit",
  autoSuggestCta: "Apply with Auto Suggest",
  extension: {
    manifestName: "EasySubmit.ai — Job Tracker",
    manifestDescription:
      "Save jobs to EasySubmit.ai Job Tracker from any supported career site.",
    actionTitle: "EasySubmit.ai Job Tracker",
    popupTitle: "EasySubmit.ai Job Tracker",
    productLine: "Job Tracker",
  },
} as const;

export type BrandClassNames = {
  wrap?: string;
  name?: string;
  suffix?: string;
};

/** Shadow-DOM / HTML string for the split wordmark with optional app icon. */
export function renderBrandMarkup(
  classNames: BrandClassNames = {},
  iconUrl?: string,
): string {
  const wrap = classNames.wrap ?? "brand";
  const nameClass = classNames.name ?? "brand-name";
  const suffixClass = classNames.suffix ?? "brand-suffix";
  const icon = iconUrl
    ? `<img class="brand-icon" src="${iconUrl}" alt="" width="20" height="20" decoding="async" />`
    : "";
  return `${icon}<span class="${wrap}"><span class="${nameClass}">${BRAND.name}</span><span class="${suffixClass}">${BRAND.suffix}</span></span>`;
}

export function brandCopyright(year: number): string {
  return `© ${year} ${BRAND.full}`;
}

/** @deprecated Prefer `BRAND.name` */
export const BRAND_NAME = BRAND.name;
/** @deprecated Prefer `BRAND.suffix` */
export const BRAND_SUFFIX = BRAND.suffix;
/** @deprecated Prefer `BRAND.full` */
export const BRAND_FULL = BRAND.full;
/** @deprecated Prefer `BRAND.tagline` */
export const EASYSUBMIT_TAGLINE = BRAND.tagline;
/** @deprecated Prefer `BRAND.applyCta` */
export const BRAND_APPLY_CTA = BRAND.applyCta;
