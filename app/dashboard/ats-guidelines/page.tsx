import { ShieldCheck, CheckCircle2, XCircle, Cpu, AlertTriangle } from "lucide-react";

type GuidelineSection = {
  title: string;
  items: string[];
};

type BulletBudgetRow = {
  tier: string;
  onePage: string;
  twoPage: string;
};

const sections: GuidelineSection[] = [
  {
    title: "Core Principle",
    items: [
      "ATS systems parse resumes as linear text, top to bottom.",
      "Anything that breaks linear flow — columns, tables, text boxes, images, header/footer fields — risks being scrambled or dropped.",
      "Visual polish (type hierarchy, spacing, alignment, accent color) is fine — it does not affect text parsing.",
      "Parsing comes before scoring: if structure fails, keyword matching never runs.",
    ],
  },
  {
    title: "Document Setup",
    items: [
      'Page size: US Letter (8.5" × 11") default; A4 available in Studio Layout for international roles.',
      'Margins: 0.5"–1" all sides. Never below 0.5". EasySubmit export uses 0.5" vertical / ~0.67" horizontal.',
      "Single font family only — Arial, Calibri, or Helvetica in Studio. Default: Calibri.",
      "Font size: 10–12pt body (EasySubmit export: 10.5pt body, 18pt name). Never below 10pt to force-fit.",
      "Single column only. Never multi-column.",
      "Name and contact info live in the document body, never in Word header/footer regions.",
      "Real list numbering for bullets — never typed unicode bullets (•, -, *).",
      "No hidden, white, or zero-opacity text — modern ATS may flag this as fraud.",
      "Save as text-selectable PDF or .docx. If you cannot highlight text in the PDF, the ATS cannot read it.",
    ],
  },
  {
    title: "Section Order (Fixed)",
    items: [
      "1. Header — Full name + one line: City, State | Phone | Email | LinkedIn URL",
      "2. Professional Summary — plain paragraph, no bullets, no \"I\" / \"my\"",
      "3. Skills — single block, comma-separated, never a table/grid",
      "4. Professional Experience — reverse chronological",
      "5. Education — reverse chronological",
      "6. Optional sections (Certifications, Projects, Languages) — after Education only if content exists",
      "Use standard section titles only — ATS keyword mapping depends on exact header strings.",
    ],
  },
  {
    title: "Professional Summary",
    items: [
      "EasySubmit target: 4 sentences, 70–80 words (plain paragraph).",
      "Structure: role + scope → method → specialization → quantified outcome.",
      "Banned filler: leverage, spearhead, passionate, synergy, results-driven, proven track record, etc.",
      "No bullets, no first person, no \"ATS score\" or keyword dumps in the document.",
    ],
  },
  {
    title: "Skills Section Rules",
    items: [
      "Target 10–15 skills on a 1-page resume; 15–20 on a 2-page resume (hard max 20).",
      "At least 70% hard skills / named methodologies; ≤30% named soft skills.",
      "Comma- or pipe-separated — no prose sentences or action verbs in the skills block.",
      "No star-ratings, progress bars, or skill-level graphics.",
      "Never list banned slot-wasters: Communication, Teamwork, Hard Worker, Attention to Detail, Time Management, Leadership, Problem Solving, etc.",
      "Skills section is a primary ATS scoring surface on Workday and Greenhouse — list JD terms here when truthful.",
    ],
  },
  {
    title: "Experience Bullets",
    items: [
      "Format: Action verb + task + quantifiable result. Avoid \"Responsible for.\"",
      "Target ~70% of bullets with a number (%, $, time, count).",
      "Hard cap: 6 bullets per role — export truncates beyond this.",
      "Line 1: Job title (bold) + tab-aligned date range (MMM YYYY – Present).",
      "Line 2: Company — City, State (italic).",
      "Date separators normalized to a single en-dash before export.",
    ],
  },
  {
    title: "Keyword Matching",
    items: [
      "Spell out the full term with the acronym on first use: \"Search Engine Optimization (SEO)\".",
      "Mirror literal JD phrasing where truthful — Workday, Taleo, and iCIMS often use exact string matching.",
      "Greenhouse and Lever use more semantic matching — bullet quality and context still matter.",
      "Aim for strong coverage, not 100% keyword stuffing — repeat top terms naturally across Summary, Skills, and bullets.",
      "Never insert a skill or keyword without supporting experience.",
    ],
  },
];

const pageLengthAutoRules: GuidelineSection = {
  title: "Page Length — Auto Rules",
  items: [
    "0–5 years experience → 1 page.",
    "5–10 years → 1 page, or 2 if content is genuinely dense (fullness test: page 2 should be ≥50–67% full of content you'd keep).",
    "10+ years → 2 pages.",
    "Director / VP / executive target role → 2 pages (even below 10 years).",
    "Federal, academic, or publication-heavy → up to 3–6 pages (industry exception).",
    "Integer pages only — never ship a 1.25-page layout; compress to 1 or expand to a real 2.",
    "ATS does not reject resumes for page count — length is a recruiter readability rule, not a parser limit.",
  ],
};

const pageLengthStudioRules: GuidelineSection = {
  title: "Page Length — Studio Control",
  items: [
    "Resume Studio → Layout → Resume length: Auto (default) | 1 page | 2 pages.",
    "Auto uses years of experience + executive title signal (see above).",
    "Manual override is saved on your profile; job-specific resumes inherit it (per-job override supported).",
    "Preview shows how many pages your content actually fills — may differ from the target budget until you trim or run Enhance.",
  ],
};

type PlatformFormatRow = {
  platform: string;
  preferred: string;
  note: string;
};

const pdfVsDocxRules: GuidelineSection = {
  title: "PDF vs Word (.docx)",
  items: [
    "Both must be text-selectable — open the file and try to highlight a sentence. If you cannot select text, the ATS reads nothing.",
    "EasySubmit generates .docx as the structural source of truth, then a matching PDF from the same content model — layout and section order stay aligned.",
    "When the application does not specify a format: .docx is the safest default for unknown or legacy ATS parsers.",
    "Use PDF when the employer portal accepts both and the parser is modern (Greenhouse, Lever, BambooHR) — PDF preserves layout on every device.",
    "Use .docx when the posting asks for Word, or when applying through Workday, Taleo, iCIMS, Jobvite, or ADP — these often parse Word more reliably.",
    "Never submit image-based PDFs (scanned documents, Canva \"Save as PDF\", photos of a resume) — parsers extract zero keywords.",
    "LinkedIn Easy Apply and some job boards re-process your file — structure matters more than format, but .docx still parses more predictably on older backends.",
    "Email to a recruiter directly: PDF is fine and looks consistent; keep a .docx copy if they ask to edit.",
  ],
};

const platformFormatRows: PlatformFormatRow[] = [
  {
    platform: "Workday",
    preferred: "Word (.docx)",
    note: "Exact keyword matching; skills section heavily weighted.",
  },
  {
    platform: "Taleo / Oracle",
    preferred: "Word (.docx)",
    note: "Legacy parser; avoid PDF. Keep dates consistent (MM/YYYY).",
  },
  {
    platform: "iCIMS",
    preferred: "Word (.docx)",
    note: "Exact string matching — \"React\" ≠ \"ReactJS\".",
  },
  {
    platform: "Jobvite / ADP",
    preferred: "Word (.docx)",
    note: "Keyword frequency matters; standard section names help.",
  },
  {
    platform: "Greenhouse",
    preferred: "PDF or Word",
    note: "Modern semantic parser; PDF parses cleanly for simple layouts.",
  },
  {
    platform: "Lever / BambooHR / SmartRecruiters",
    preferred: "PDF or Word",
    note: "Modern parsers — bullet quality often beats raw keyword count.",
  },
  {
    platform: "Unknown ATS",
    preferred: "Word (.docx)",
    note: "Default to .docx when you cannot detect the employer's system.",
  },
];

const bulletBudgetRows: BulletBudgetRow[] = [
  { tier: "Most recent role", onePage: "4–5 bullets (min 3, max 5)", twoPage: "4–5 bullets (min 3, max 6)" },
  { tier: "Second role", onePage: "3–4 bullets (min 2, max 3)", twoPage: "3–4 bullets (min 2, max 4)" },
  { tier: "Older roles", onePage: "1–2 bullets (min 1, max 2)", twoPage: "1–2 bullets (min 1, max 2)" },
  { tier: "Roles in detail", onePage: "2–3 roles", twoPage: "3–4 roles" },
];

const enhanceAiOffRules: GuidelineSection = {
  title: "Enhance with AI Off (Deterministic)",
  items: [
    "Page length still applies via deterministic Enhance — no AI credits required.",
    "Pipeline: split mashed PDF roles → clean skills → rewrite weak bullets → JD keyword weave (when job description exists) → taper bullets by recency to page budget → summary rewrite if needed.",
    "Taper trims oldest roles first; never more than 6 bullets under any single role.",
    "Plain save/export without Enhance does not auto-taper — Studio validation warns; export only hard-caps at 6 bullets/role.",
  ],
};

const enhanceAiOnRules: GuidelineSection = {
  title: "Enhance with AI On",
  items: [
    "Deterministic baseline runs first (including bullet taper), then AI refines within the same page budget.",
    "AI prompt includes page budget, bullet caps, skills limits, and banned summary phrases.",
    "If AI is blocked or fails, you keep the deterministic baseline result.",
    "Job Apply: JD skills intelligence, coverage report, and grouped skills merge when a job description is present.",
  ],
};

const easySubmitEnforcement: GuidelineSection = {
  title: "What EasySubmit Enforces Today",
  items: [
    "Fixed ATS section order and canonical section titles on every export.",
    "Word (.docx) and PDF export from Review / Job Studio — same content model, shared spacing rhythm.",
    "Studio validation: header, summary word/sentence limits, skills count, bullet budgets, banned skills.",
    "Readiness score (Review → ATS tab): Completeness, Keyword match, Bullet quality, ATS compliance.",
    "ATS parse simulator + keyword gap + bullet quality engines on tailored resumes.",
    "Platform-specific tips (Workday, Greenhouse, Lever, Taleo, iCIMS, etc.) from job URL when known.",
    "Deterministic enhance: recency bullet taper, mashed-role split, weak-bullet rewrite, JD weave.",
    "Resume length preference (Auto / 1 / 2) wired into enhance, validation, and export warnings.",
  ],
};

const notYetAutomated: GuidelineSection = {
  title: "Guidance Not Yet Fully Automated",
  items: [
    "3–6 page federal/academic format — documented in spec; engine currently caps at 2 pages in code.",
    "5–10 year \"dense content → 2 pages\" auto signal — spec allows it; Auto still defaults to 1 page until density logic ships.",
    "Auto page-fit on save/export without Enhance — preview shows spillover; user must Enhance or trim manually.",
    "Per-platform export format picker — tips exist in ATS panel; export UI does not auto-select Word vs PDF.",
    "Plain-text paste test in UI — recommended industry check; not built as a dashboard tool yet.",
    "Uploaded/scanned PDF re-parse quality checks — we parse imports but do not run full §8 lint on arbitrary uploads.",
    "Times New Roman font option in Studio — export stack supports Arial/Calibri/Helvetica family.",
    "Explicit 65–75% JD keyword match target as a scored UX goal — gap analysis exists; target band not surfaced as a hard rule.",
  ],
};

const industryResearchExtras: GuidelineSection = {
  title: "Industry Best Practices (2026 Research)",
  items: [
    "Plain-text test: paste resume into Notepad — if structure collapses, fix format before applying.",
    "Avoid Canva, image-only PDFs, and design-tool exports — parsers read zero text.",
    "Consistent dates: MMM YYYY – Present, Jan 2021 – May 2024, or YYYY – YYYY are all acceptable if consistent.",
    "Do not put contact info in Word header/footer — many parsers skip those regions entirely.",
    "Two-column \"modern\" templates still scramble on Workday, iCIMS, and Taleo — stay single column.",
  ],
};

const neverList = [
  "Multi-column layout",
  "Tables for layout (contact, skills, dates)",
  "Text boxes or floating shapes",
  "Content wrapping or clipping that breaks text extraction",
  "Content in Word header/footer fields",
  "Images, icons, logos, photos, graphic dividers",
  "Hidden, white, or zero-opacity text",
  "Typed unicode bullets instead of real list numbering",
  "More than one font family",
  'Font size below 10pt or margins below 0.5"',
  "More than 6 pages, or any non-integer layout",
  "More than 6 bullets under any single role",
  "Fixed/hardcoded number of role slots in templates",
  "Creative / non-standard section header names",
  "Skill star-ratings or progress-bar graphics",
  'The word "ATS," a fake score, or keyword dumps printed in the resume',
];

function GuidelineCard({
  section,
  variant = "default",
}: {
  section: GuidelineSection;
  variant?: "default" | "warning" | "info";
}) {
  const borderClass =
    variant === "warning"
      ? "border-warning/30 bg-warning/5"
      : variant === "info"
        ? "border-primary/25 bg-primary/5"
        : "border-border bg-surface";

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${borderClass}`}>
      <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide">
        {section.title}
      </h2>
      <ul className="space-y-1.5">
        {section.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
            {variant === "warning" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : variant === "info" ? (
              <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AtsGuidelinesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-mint shrink-0" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">ATS Guidelines</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Rules EasySubmit follows for parse-safe resumes — plus what the product enforces automatically
            vs what still needs your judgment.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <GuidelineCard key={section.title} section={section} />
        ))}

        <GuidelineCard section={pdfVsDocxRules} />

        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide">
            Export Format by ATS Platform
          </h2>
          <p className="text-sm text-muted-foreground">
            When EasySubmit detects the employer ATS from the job URL, the Review → ATS tab shows a
            platform-specific tip. Use this table as a general reference when choosing Word vs PDF.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 font-medium text-foreground">Platform</th>
                  <th className="px-3 py-2 font-medium text-foreground">Preferred format</th>
                  <th className="px-3 py-2 font-medium text-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {platformFormatRows.map((row) => (
                  <tr key={row.platform} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{row.platform}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.preferred}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <GuidelineCard section={pageLengthAutoRules} />
        <GuidelineCard section={pageLengthStudioRules} />

        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide">
            Bullet Budget by Page Length
          </h2>
          <p className="text-sm text-muted-foreground">
            Applied on deterministic Enhance (AI off or as baseline before AI). Trim order: oldest roles
            first.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 font-medium text-foreground">Recency tier</th>
                  <th className="px-3 py-2 font-medium text-foreground">1-page budget</th>
                  <th className="px-3 py-2 font-medium text-foreground">2-page budget</th>
                </tr>
              </thead>
              <tbody>
                {bulletBudgetRows.map((row) => (
                  <tr key={row.tier} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{row.tier}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.onePage}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.twoPage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <GuidelineCard section={enhanceAiOffRules} variant="info" />
        <GuidelineCard section={enhanceAiOnRules} variant="info" />
        <GuidelineCard section={easySubmitEnforcement} variant="info" />
        <GuidelineCard section={industryResearchExtras} />

        <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-wide">
            Hard Never List
          </h2>
          <ul className="space-y-1.5">
            {neverList.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.22_25)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <GuidelineCard section={notYetAutomated} variant="warning" />
      </div>
    </div>
  );
}
