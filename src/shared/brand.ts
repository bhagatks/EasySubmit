/**
 * EasySubmit.ai brand — single source of truth for web app + extension.
 * Display: capital E + S only; suffix always lowercase `.ai`.
 */

import { isDevAnalyticsEnvironment } from "@/src/shared/analytics/config";

/** Published Chrome Web Store listing ID (EasySubmit.ai — Job Tracker). */
export const EXTENSION_ID = "ondcaafebdfegfkmdggeklofnmbijmlc";

export const EXTENSION_STORE_URL = `https://chromewebstore.google.com/detail/${EXTENSION_ID}`;

/** Per-job tailored resume editor — dashboard + extension label. */
export const RESUME_STUDIO_LABEL = "Resume Studio" as const;

export const BRAND = {
  name: "EasySubmit",
  suffix: ".ai",
  full: "EasySubmit.ai",
  tagline: "Apply smarter, not harder!",
  applyCta: "Apply with EasySubmit",
  autoSuggestCta: "Apply with Auto Suggest",
  extension: {
    manifestName: "EasySubmit.ai — Job Tracker",
    /** Chrome toolbar name for unpacked dev build (`dist/extension-dev`). */
    devManifestName: "Dev Easy",
    manifestDescription:
      "Save jobs to EasySubmit.ai Job Tracker from any supported career site.",
    actionTitle: "EasySubmit.ai Job Tracker",
    devActionTitle: "Dev Easy",
    popupTitle: "EasySubmit.ai Job Tracker",
    devPopupTitle: "Dev Easy",
    productLine: "Job Tracker",
  },
} as const;

/** Must match Google Cloud OAuth consent screen URLs exactly (href literals for verification crawlers). All www — apex redirects and fails Google's static-URL check. */
export const OAUTH_BRANDING_URLS = {
  home: "https://www.easysubmit.ai",
  /** Static HTML — no JS; use as Application home page in Google Cloud Console. */
  verification: "https://www.easysubmit.ai/oauth-brand.html",
  about: "https://www.easysubmit.ai/about",
  privacy: "https://www.easysubmit.ai/privacy",
  terms: "https://www.easysubmit.ai/terms",
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

/** In-page extension card header — prod: EasySubmit.ai; dev: EasySubmit.ai dev */
export function renderExtensionCardBrandMarkup(
  classNames: BrandClassNames = {},
  iconUrl?: string,
): string {
  const devTag = isDevAnalyticsEnvironment()
    ? `<span class="brand-env"> dev</span>`
    : "";
  const wrap = classNames.wrap ?? "brand";
  const nameClass = classNames.name ?? "brand-name";
  const suffixClass = classNames.suffix ?? "brand-suffix";
  const icon = iconUrl
    ? `<img class="brand-icon" src="${iconUrl}" alt="" width="20" height="20" decoding="async" />`
    : "";
  return `${icon}<span class="${wrap}"><span class="${nameClass}">${BRAND.name}</span><span class="${suffixClass}">${BRAND.suffix}</span>${devTag}</span>`;
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
