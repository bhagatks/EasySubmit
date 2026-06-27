# EasySubmit Resume Formatting Rules
**Canonical spec for Word/PDF resume generation.**

- **Code constants:** `lib/resume/resumeSpec.ts` (section order, titles, fixture paths)
- **Server paths:** `lib/resume/resumeFixtures.server.ts`
- **Golden template:** `ATS_Universal_Resume_Template.pdf` / `.docx` (same directory)
- **Cursor rule:** `.cursor/rules/easysubmit-resume-format.mdc`

Scope: static document generation only (no AI job-tailoring in this version). Output: .docx (source of truth) + matching PDF.

---

## 0. Non-negotiable principle

ATS systems parse resumes as **linear text, top to bottom**. Anything that breaks linear flow — columns, tables, text boxes, images, header/footer fields — risks being scrambled or dropped. Every rule below protects that flow. If a future design idea conflicts with this, this principle wins.

**This does not mean the resume has to look plain.** Visual polish comes from type hierarchy, spacing rhythm, alignment, and a restrained accent color — none of which an ATS parser reads or cares about, because none of it touches the text content or its order. A bottom border under a heading, generous paragraph spacing, a colored section label, tab-aligned dates — all of this renders as plain sequential text to a parser while looking intentional and designed to a human. The "never" list in §8 targets layout mechanisms that break parsing (tables, columns, text boxes, images), not visual refinement.

---

## 1. Document setup

| Property | Rule |
|---|---|
| Page size | US Letter (8.5" × 11" / 12240 × 15840 DXA) |
| Margins | 0.5"–1" all sides. Never below 0.5". |
| Font | Single family only — Arial, Calibri, or Helvetica. Never decorative/condensed/script fonts. |
| Font size | 10–12pt body. Never below 10pt anywhere, even to force-fit content. |
| Source of truth | Generate **.docx first**; render PDF from that .docx (e.g. LibreOffice headless). Never generate PDF independently — outputs must always match. |
| Columns | Single column only. Never multi-column. |
| Header/Footer fields | Forbidden. Name and contact info live in the document **body**, never in a Word header/footer region — many parsers skip these entirely. |
| Tables | Forbidden for layout or content (no table for contact line, skills, or dates). |
| Text boxes / floating shapes | Forbidden. All text inline and selectable as part of normal document flow. |
| Text wrapping / clipping | Forbidden. Text elements must never use wrapping, cropping, clipping, or fixed boundary truncation attributes that could obscure string extraction. |
| Images / icons / logos | Forbidden in the body. No icon bullets, no photo, no graphic dividers. |
| Bullets | Real list numbering (`LevelFormat.BULLET` in docx-js, or equivalent). Never typed unicode bullets (•, -, *) or manual dashes. |
| Hidden/white text | Forbidden under any circumstance. Modern ATS platforms (Workday, Greenhouse, Lever) actively detect zero-opacity or same-color-as-background text and can auto-reject with a fraud flag attached to the candidate record. |

---

## 2. Typography scale

| Element | Size | Weight | Color |
|---|---|---|---|
| Name (header) | 18–20pt | Bold | near-black |
| Contact line | 10pt | Regular | dark gray |
| Section headings | 12pt | Bold, ALL CAPS or Title Case (pick one, stay consistent) | dark navy or black |
| Job title / Degree | 11pt | Bold | near-black |
| Company / Institution line | 10–10.5pt | Italic | dark gray |
| Body text / bullets | 10–10.5pt | Regular | dark gray/black |

A thin bottom border under section headings is the only permitted decorative element — it's plain paragraph spacing to a parser, not a graphic.

---

## 3. Section order (fixed)

1. **Header** — Full Name, then one line: City, State | Phone | Email | LinkedIn URL
2. **Professional Summary** — 2–3 sentences, plain paragraph, no bullets
3. **Skills** — single block, comma- or bullet-separated, never a table/grid. Omit section entirely if empty.
4. **Professional Experience** — reverse chronological
5. **Education** — reverse chronological
6. **Optional sections** (Certifications, Projects, Languages) — same plain pattern, appended after Education only if content exists

Never reorder. Never rename sections creatively ("My Journey" instead of "Professional Experience") — ATS keyword mapping depends on standard header text.

---

## 4. Section-specific rules

**Header** — plain text, never an image/WordArt. Contact line pipe-separated, wraps naturally, never a table.

**Professional Summary** — 2–3 sentences, no bullets, no "I"/"my." Include: target role, years of experience, 2–3 core skills, one differentiator.

**Skills** — 6–20 items for manual editing (target 10–15); AI/deterministic target 15–20 (hard max 20). ≥70% hard skills / named methodologies, ≤30% named soft skills. Comma- or pipe-separated tools, technologies, platforms, and methodologies — no prose sentences (>4 words or action verbs). Never list banned slot-wasters: Communication, Teamwork, Hard Worker, Attention to Detail, Time Management, Adaptability, Creativity, Positive Attitude, Fast Learner, Multitasking, Problem Solving, Leadership, Collaboration, Motivated, Organized, Flexible, Detail-Oriented, People Skills, Interpersonal Skills, Work Ethic. No star ratings, progress bars, or skill-level graphics.

**Professional Experience** (per role)
- Line 1: **Job Title** (bold), tab-aligned right with **Date Range** (`MMM YYYY – MMM YYYY` or `MMM YYYY – Present`). Real tab stop, never spaces/tables. 
- Date Sanitization: Sanitize all user-input or parsed date-range separator characters down to a single standard en-dash (`–`) or hyphen (`-`) before compilation to ensure predictable ATS parser reading.
- Line 2: *Company — City, State* (italic)
- Bullets: **Action verb + task + quantifiable result.** Avoid "Responsible for." Target ~70% of bullets with a number (%, $, time, count).
- Bullet count **tapers by role recency** (see §6.3) — never more than **6 per role** (hard cap).

**Education** — same tab-stop pattern: Degree, Major (bold) — right-aligned graduation date. Institution — City, State (italic) below. GPA only if 3.5+, own short line.

**Optional sections** — same typography as Experience/Education. Never invent a new visual pattern for a new section type.

---

## 5. Acronyms and keyword matching

- Spell out the full term with the acronym on first use: *"Search Engine Optimization (SEO)"*, not just "SEO." Some ATS platforms don't expand abbreviations, so both forms need to appear.
- Where the user's experience genuinely supports it, mirror literal phrasing the target job posting uses rather than a paraphrase — some parsers do exact string matching, not semantic/synonym matching, so close wording matters more than natural variation.
- Truthful only — never insert a skill or keyword without supporting experience.

---

## 6. Page-length engine (1–6 pages)

### 6.1 Integer pages only
Allowed: 1, 2, 3, 4, 5, 6. Never ship a "1.5 page" layout — compress content to fit N, or let it flow to N+1. No partial pages.

### 6.2 Selection signals

| Signal | Recommended pages |
|---|---|
| 0–5 years experience | 1 |
| 5–10 years | 1, or 2 if content is genuinely dense |
| 10+ years | 2 |
| Director/VP/executive title | 2 (bias up) |
| Federal, academic, or publication-heavy background | up to 3–6 |

Default for most users: **1–2 pages.** Don't default anyone into 3+ pages without one of the above signals.

### 6.3 Content budget by page count

| Pages | Roles shown in detail | Bullets per role (by recency) | Skills total |
|---|---|---|---|
| 1 | 2–3 | Recent **4–5** (min 3, max 5) · mid **3–4** (min 2, max 3) · older **1–2** (min 1, max 2) | 10–15 (hard max 20) |
| 2 | 3–4 | Recent **4–5** (min 3, max 6) · mid **3–4** (min 2, max 4) · older **1–2** (min 1, max 2) | 15–20 |
| 3–6 | 4+ | Same recency taper; hard max **6** per role | grouped, ~10–15 per group |

**Recency tiers:** most recent visible role = *recent*; second = *mid*; third and older = *older*. Trim bullets from **oldest/least relevant roles first** when content overflows — never shrink below the type/margin floors in §1 to force a fit.

### 6.4 No hardcoded role/bullet slots
Don't build the template with a fixed number of job blocks (e.g. "exactly 3 companies"). The structure must support however many roles the page budget calls for — including 5+ for long-format federal/academic resumes. A rigid slot count silently truncates real candidates' work history.

---

## 7. Why this matters (ATS scoring context, 2026)

- Skills sections are now a primary scoring surface, not just a parsing nicety — many enterprise ATS platforms (Greenhouse, Workday) map the Skills section directly to scorecard criteria before reviewing job history, and a skill listed there is weighted as a self-declared competency, scored higher than the same word appearing once inside a bullet.
- Single-column layouts parse more reliably than two-column "modern" templates — the market drifted toward stylish multi-column resumes for a few years, but two-column sidebars (skills, contact info) get dropped entirely by a meaningful share of real-world ATS parsers.
- .docx often out-parses PDF for clean text extraction — reinforces generating .docx as the source of truth, not PDF.

---

## 8. Hard "never" list (for code review / automated linting)

- ❌ Multi-column layout
- ❌ Tables for layout (contact, skills, dates)
- ❌ Text boxes or floating shapes
- ❌ Content wrapping or clipping layouts that break standard text flows
- ❌ Content in Word header/footer fields
- ❌ Images, icons, logos, photos, graphic dividers
- ❌ Hidden, white, or zero-opacity text of any kind
- ❌ Typed unicode bullets instead of real list numbering
- ❌ More than one font family
- ❌ Font size below 10pt or margins below 0.5"
- ❌ More than 6 pages, or any non-integer "1.5 page" layout
- ❌ More than 6 bullets under any single role
- ❌ Fixed/hardcoded number of role or bullet slots in the template structure
- ❌ Creative section header names
- ❌ Skill star-ratings or progress-bar graphics
- ❌ The word "ATS," a fake score, or any scoring claim printed anywhere in the document — including in source comments inside template files, since a stray comment can leak into rendered output if the build pipeline ever changes

---

## 9. Implementation notes

- Build the .docx with real paragraph styles (custom Heading-equivalent styles), not scattered inline bold/font overrides — keeps every generated resume structurally identical.
- Use a numbering config (`LevelFormat.BULLET`) referenced by every bullet paragraph, never inline bullet characters.
- Use right-aligned tab stops (`TabStopType.RIGHT`, `TabStopPosition.MAX`) for every title↔date and degree↔date line.
- Render PDF **from** the generated .docx so the two formats can never drift apart.
- Validate every generated .docx against §8 before returning it to the user: page count, font family count, margin size, bullet count per role, section order/names, text wrapping behaviors, and absence of every forbidden element.