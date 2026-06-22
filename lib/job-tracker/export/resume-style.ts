/**
 * Single source of truth for resume visual constants.
 * All three renderers (HTML preview, PDF, Word) pull from here.
 * Rules reference: docs/resume/RULES.md
 */

// ─── Typography ──────────────────────────────────────────────────────────────

export const FONT_FAMILY_BODY = "Calibri, Arial, sans-serif";
export const FONT_FAMILY_PDF = "Helvetica"; // @react-pdf built-in, ATS-safe

export const FONT_SIZE = {
  name: 18,       // pt — header name
  contact: 10,    // pt — contact line
  section: 11,    // pt — section heading (ALL CAPS + bottom border)
  entryTitle: 11, // pt — job title / degree
  entrySub: 10,   // pt — company / institution (italic)
  body: 10.5,     // pt — bullets + summary
} as const;

export const LINE_HEIGHT = 1.25;

// ─── Colors ──────────────────────────────────────────────────────────────────

export const COLOR = {
  nearBlack: "#111827",
  darkGray:  "#374151",
  midGray:   "#6B7280",
  border:    "#D1D5DB",
  white:     "#FFFFFF",
} as const;

// ─── Spacing (pt) ────────────────────────────────────────────────────────────

export const SPACING = {
  pageMarginV:     36, // 0.5in = 36pt
  pageMarginH:     48, // 0.67in = 48pt
  afterName:        4,
  afterContact:    14,
  afterSectionRule: 4,
  betweenSections: 12,
  betweenEntries:  10,
  afterEntryHead:   2,
  afterEntrySub:    4,
  bulletIndent:    12,
  bulletGap:        3,
} as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

/** US Letter — 612 × 792 pt */
export const PAGE = {
  width:  612,
  height: 792,
} as const;

// ─── Section names ────────────────────────────────────────────────────────────
// Mirror RESUME_SECTION_TITLES exactly — ATS depends on these strings.

export const SECTION_TITLE = {
  summary:    "Professional Summary",
  skills:     "Skills",
  experience: "Professional Experience",
  education:  "Education",
  certs:      "Certifications",
  projects:   "Projects",
  languages:  "Languages",
} as const;

// ─── Word-specific ────────────────────────────────────────────────────────────

/** DXA = twentieths of a point. 1pt = 20 DXA. */
export const DXA_PER_PT = 20;
export const dxa = (pt: number) => Math.round(pt * DXA_PER_PT);

/** Right tab stop at the right body margin — for title ↔ date alignment. */
export const TAB_STOP_RIGHT_DXA = dxa(PAGE.width - SPACING.pageMarginH * 2);

/** Bullet list XML numbering reference id (defined once, referenced per paragraph). */
export const BULLET_NUMBERING_ID = 1;
