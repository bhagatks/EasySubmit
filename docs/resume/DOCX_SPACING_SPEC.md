# DOCX Spacing & Alignment Spec

Consolidates all spacing/style changes needed to bring the Word export visually in line with the PDF renderer. Header block (name + contact) is intentionally excluded — current values are acceptable.

---

## Spacing Constants (`resume-style.ts` → `SPACING`)

| Constant | Current (pt) | Proposed (pt) | Reason |
|---|---:|---:|---|
| `betweenSections` | 12 | 14 | Sections bleed together; needs more air above each heading |
| `afterSectionRule` | 4 | 6 | Heading rule → first content line is too tight |
| `afterEntryHead` | 2 | 4 | Job title and company name appear stacked/merged |
| `afterEntrySub` | 4 | 6 | Company → first bullet needs clearer separation |
| `bulletGap` | 3 | 4 | Slightly tight in Word due to line height interaction |
| `betweenEntries` | 10 | 8 | Reduced slightly to compensate for increased section spacing |

---

## DOCX-Specific Fixes (`resume-docx.ts`)

| Location | Current | Proposed | Reason |
|---|---|---|---|
| `LINE_HEIGHT_DXA` | 240 (1.0×) | 276 (1.15×) | PDF uses 1.25 line height; DOCX renders tighter due to 1.0 — closing the gap |
| `bodyParagraph` after-spacing | hardcoded `dxa(4)` | `dxa(SPACING.afterSectionRule)` | Inconsistent with all other paragraphs; should use the shared constant |

---

## Alignment Rules (unchanged, documented for reference)

| Element | Alignment |
|---|---|
| Name | Center |
| Contact line | Center |
| Section headings | Left |
| Entry title + date | Left (date right-aligned via tab stop) |
| Company / institution | Left, italic |
| Bullets | Left, indented 12pt with hanging indent |
| Summary / skills body | Left |

---

## What this does NOT change

- Header spacing (`afterName`, `afterContact`) — current values are fine
- Page margins (`pageMarginV`, `pageMarginH`)
- Font sizes, colors, or font family
- Bullet indent or tab stop positions
- Section title strings (ATS-critical, never touch)
