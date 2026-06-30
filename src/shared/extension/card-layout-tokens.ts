/**
 * Extension card layout tokens — 4px grid, aligned with brand (12px radius, #1F2937 text).
 * Import values in TS tests; emit CSS vars for Shadow DOM stylesheets.
 */

import { RESUME_STUDIO_LABEL } from "@/src/shared/brand";

export const CARD_NAV_LABELS = {
  jobInfo: "Job Info",
  resume: "Resume",
  coverLetter: "Cover Letter",
} as const;

export const CARD_STUDIO_LABEL = RESUME_STUDIO_LABEL;

export const EXTENSION_CARD_LAYOUT = {
  /** Horizontal inset for all card bodies */
  paddingX: 16,
  /** Top inset below header / AI banner */
  paddingY: 16,
  /** Extra bottom inset on summary (CTA breathing room) */
  paddingBottomSummary: 18,
  /** Global corner radius (matches product) */
  radius: 12,
  /** Gap between hero blocks (title, company, review pills) */
  heroGap: 12,
  /** Gap between generic stacked sections */
  sectionGap: 12,
  /** Gap between stacked buttons in action zone */
  actionsGap: 8,
  /** Space above the CTA footer (summary home card) */
  ctaZoneMarginTop: 12,
  /** Padding inside CTA footer below divider */
  ctaZonePaddingTop: 12,
  /** Summary job title */
  titleSize: 16,
  titleWeight: 700,
  titleLineHeight: 1.4,
  /** Detail / expanded views */
  detailHeaderMarginBottom: 12,
  detailToolbarMarginBottom: 12,
  detailFieldsPadding: 14,
  expandScrollMinHeight: 200,
  minExpandedBodyHeight: 200,
} as const;

export function extensionCardLayoutCssVars(): string {
  const t = EXTENSION_CARD_LAYOUT;
  return `
    .glossy-stack {
      --es-card-px: ${t.paddingX}px;
      --es-card-py: ${t.paddingY}px;
      --es-card-pb-summary: ${t.paddingBottomSummary}px;
      --es-hero-gap: ${t.heroGap}px;
      --es-section-gap: ${t.sectionGap}px;
      --es-actions-gap: ${t.actionsGap}px;
      --es-cta-zone-mt: ${t.ctaZoneMarginTop}px;
      --es-cta-zone-pt: ${t.ctaZonePaddingTop}px;
      --es-detail-header-mb: ${t.detailHeaderMarginBottom}px;
      --es-detail-toolbar-mb: ${t.detailToolbarMarginBottom}px;
      --es-radius: ${t.radius}px;
    }
  `;
}

export function extensionCardLayoutStyles(): string {
  const t = EXTENSION_CARD_LAYOUT;
  return `
    ${extensionCardLayoutCssVars()}
    .body-summary {
      padding: var(--es-card-py) var(--es-card-px) var(--es-card-pb-summary);
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .body-expanded {
      padding: var(--es-card-py) var(--es-card-px) var(--es-card-py);
      display: flex;
      flex-direction: column;
      min-height: ${t.minExpandedBodyHeight}px;
      gap: 0;
    }
    .card-hero {
      display: flex;
      flex-direction: column;
      gap: var(--es-hero-gap);
      min-width: 0;
    }
    .card-actions {
      display: flex;
      flex-direction: column;
      gap: var(--es-actions-gap);
      margin-top: var(--es-cta-zone-mt);
      padding-top: var(--es-cta-zone-pt);
      border-top: 1px solid #F1F5F9;
    }
    .card-actions .journey-status {
      margin: 0;
      padding-bottom: 2px;
    }
    .card-actions:first-child {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }
    .card-hero .title {
      margin: 0;
    }
    .title {
      font-size: ${t.titleSize}px;
      font-weight: ${t.titleWeight};
      line-height: ${t.titleLineHeight};
      letter-spacing: -0.02em;
      color: #1F2937;
      margin: 0 0 var(--es-hero-gap);
    }
    .detail-view-title {
      margin: 0 0 var(--es-section-gap);
    }
    .row-split {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--es-section-gap);
      margin: 0;
    }
    .journey-status {
      margin: 0;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
    }
    .expand-header {
      margin: 0 0 var(--es-detail-header-mb);
    }
    .detail-toolbar {
      margin: 0 0 var(--es-detail-toolbar-mb);
    }
    .detail-fields {
      padding: ${t.detailFieldsPadding}px;
    }
    .save-error {
      margin: 0;
    }
    .card-actions .save-error,
    .card-hero .save-error {
      margin: 0;
    }
  `;
}
