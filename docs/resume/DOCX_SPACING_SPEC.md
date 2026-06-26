# Resume export spacing (Word vs PDF)

Word and PDF use **separate spacing tables** in `lib/job-tracker/export/resume-style.ts` (`DOCX_SPACING` vs `PDF_SPACING`). HTML preview follows `PDF_SPACING` via the `SPACING` alias.

---

## DOCX (`DOCX_SPACING`) — more vertical air

Word renders tighter than PDF at the same pt values, so section gaps are ~2× PDF.

| Constant | PDF (pt) | DOCX (pt) | Applies to |
|---|---:|---:|---|
| `afterContact` | 10 | 28 | Contact line → first section heading |
| `betweenSections` | 10 | 28 | Before each section heading |
| `afterSectionBody` | 4 | 20 | Summary/skills body → next section heading |
| `afterSectionRule` | 4 | 6 | Section rule → first content line |

Shared: `afterName`, page margins, entry/bullet spacing.

---

## PDF (`PDF_SPACING`) — tighter rhythm

React-PDF flex layout reads larger; section gaps stay at 10pt with 4pt body tail.

---

## DOCX line height

`LINE_HEIGHT_DXA = 276` (1.15× body) in `resume-docx.ts` — not wrapped in `dxa()` (276 is already DXA).

---

## Experience date alignment (Word)

Title line uses a right tab stop (`tabStopRightDxa(DOCX_SPACING)`) so dates align to the right margin. When structured month/year fields are empty and dates are mashed into the title (e.g. `CVS HealthSep 2014 – Dec 2023`), `resolveResumeEntryTitleLine` in `resume-content-model.ts` splits company and date before export.

---

## What this does NOT change

- Font sizes, colors, or font family
- Page margins (`pageMarginV`, `pageMarginH`)
- Section title strings (ATS-critical)
- Bullet indent positions
