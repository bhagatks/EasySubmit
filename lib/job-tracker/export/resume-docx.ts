/**
 * ATS-safe Word (.docx) resume generator.
 * Implements docs/resume/RULES.md in full:
 *   - Single column, no tables, no text boxes, no images
 *   - Real paragraph heading styles (not scattered inline bold)
 *   - Real bullet numbering (not typed unicode bullets)
 *   - Right-aligned tab stop for title ↔ date lines
 *   - Content in document body only — no Word header/footer fields
 *   - Validates §8 hard "never" rules before returning bytes
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
  UnderlineType,
} from "docx";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  BULLET_NUMBERING_ID,
  COLOR,
  dxa,
  FONT_SIZE,
  SECTION_TITLE,
  SPACING,
  TAB_STOP_RIGHT_DXA,
} from "@/lib/job-tracker/export/resume-style";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pt(size: number) {
  return size * 2; // docx half-points
}

function line(v: string | null | undefined): string {
  return v?.trim() ?? "";
}

/** Normalize date range to "Mon YYYY – Mon YYYY" or single side. */
function formatDateRange(
  startMonth: string,
  startYear: string,
  endMonth: string,
  endYear: string,
): string {
  const start = [startMonth, startYear].map(line).filter(Boolean).join(" ");
  const end = [endMonth, endYear].map(line).filter(Boolean).join(" ");
  // normalize separators per RULES.md §4
  if (start && end) return `${start} – ${end}`; // en-dash
  return start || end;
}

// ─── Paragraph builders ───────────────────────────────────────────────────────

function nameParagraph(name: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: dxa(SPACING.afterName) },
    children: [
      new TextRun({
        text: name,
        bold: true,
        size: pt(FONT_SIZE.name),
        color: COLOR.nearBlack.replace("#", ""),
        font: "Calibri",
      }),
    ],
  });
}

function contactParagraph(contact: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: dxa(SPACING.afterContact) },
    children: [
      new TextRun({
        text: contact,
        size: pt(FONT_SIZE.contact),
        color: COLOR.midGray.replace("#", ""),
        font: "Calibri",
      }),
    ],
  });
}

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: {
      before: dxa(SPACING.betweenSections),
      after: dxa(SPACING.afterSectionRule),
    },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 4, // quarter-pt
        color: COLOR.border.replace("#", ""),
        space: 2,
      },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: pt(FONT_SIZE.section),
        color: COLOR.nearBlack.replace("#", ""),
        font: "Calibri",
        allCaps: true,
      }),
    ],
  });
}

/** Job title (left) + date range (right) on one line via tab stop. */
function entryTitleLine(title: string, date: string): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(SPACING.afterEntryHead) },
    tabStops: [{ type: TabStopType.RIGHT, position: TAB_STOP_RIGHT_DXA }],
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: pt(FONT_SIZE.entryTitle),
        color: COLOR.nearBlack.replace("#", ""),
        font: "Calibri",
      }),
      ...(date
        ? [
            new TextRun({ text: "\t", font: "Calibri" }),
            new TextRun({
              text: date,
              size: pt(FONT_SIZE.contact),
              color: COLOR.midGray.replace("#", ""),
              font: "Calibri",
            }),
          ]
        : []),
    ],
  });
}

function entrySubLine(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(SPACING.afterEntrySub) },
    children: [
      new TextRun({
        text,
        italics: true,
        size: pt(FONT_SIZE.entrySub),
        color: COLOR.midGray.replace("#", ""),
        font: "Calibri",
      }),
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(SPACING.bulletGap) },
    numbering: { reference: "bullet-list", level: 0 },
    children: [
      new TextRun({
        text,
        size: pt(FONT_SIZE.body),
        color: COLOR.darkGray.replace("#", ""),
        font: "Calibri",
      }),
    ],
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(4) },
    children: [
      new TextRun({
        text,
        size: pt(FONT_SIZE.body),
        color: COLOR.darkGray.replace("#", ""),
        font: "Calibri",
      }),
    ],
  });
}

function emptyLine(afterPt = 4): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(afterPt) },
    children: [new TextRun({ text: "" })],
  });
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildSummarySection(summary: string): Paragraph[] {
  const text = line(summary);
  if (!text) return [];
  return [sectionHeading(SECTION_TITLE.summary), bodyParagraph(text)];
}

function buildSkillsSection(skillsText: string): Paragraph[] {
  const text = line(skillsText);
  if (!text) return [];
  return [sectionHeading(SECTION_TITLE.skills), bodyParagraph(text)];
}

function buildExperienceSection(
  experience: HubRefineryForm["experience"],
): Paragraph[] {
  const entries = experience.filter(
    (e) => !e.hidden && (line(e.title) || line(e.company)),
  );
  if (entries.length === 0) return [];

  const paras: Paragraph[] = [sectionHeading(SECTION_TITLE.experience)];

  for (const entry of entries) {
    const title = line(entry.title) || "Role";
    const date = formatDateRange(
      entry.startMonth,
      entry.startYear,
      entry.endMonth,
      entry.endYear,
    );
    const sub = [line(entry.company), line(entry.location)]
      .filter(Boolean)
      .join(" – ");

    paras.push(entryTitleLine(title, date));
    if (sub) paras.push(entrySubLine(sub));

    const bullets = entry.bullets
      .split("\n")
      .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
      .filter(Boolean)
      .slice(0, 6); // RULES.md §8: never more than 6 per role

    for (const bullet of bullets) {
      paras.push(bulletParagraph(bullet));
    }

    paras.push(emptyLine(SPACING.betweenEntries));
  }

  return paras;
}

function buildEducationSection(
  education: HubRefineryForm["education"],
): Paragraph[] {
  const entries = education.filter(
    (e) => !e.hidden && (line(e.degree) || line(e.school)),
  );
  if (entries.length === 0) return [];

  const paras: Paragraph[] = [sectionHeading(SECTION_TITLE.education)];

  for (const entry of entries) {
    const title = line(entry.degree) || line(entry.school);
    const date = formatDateRange(
      entry.startMonth,
      entry.startYear,
      entry.endMonth,
      entry.endYear,
    );
    const sub =
      line(entry.degree) && line(entry.school)
        ? [line(entry.school), line(entry.location)].filter(Boolean).join(", ")
        : line(entry.location);

    paras.push(entryTitleLine(title, date));
    if (sub) paras.push(entrySubLine(sub));
    paras.push(emptyLine(SPACING.betweenEntries));
  }

  return paras;
}

function buildSimpleListSection(
  title: string,
  items: Array<{ text: string; hidden?: boolean }>,
): Paragraph[] {
  const visible = items.filter((i) => !i.hidden && line(i.text));
  if (visible.length === 0) return [];

  return [
    sectionHeading(title),
    ...visible.map((i) => bulletParagraph(line(i.text))),
    emptyLine(SPACING.betweenEntries),
  ];
}

function buildCustomSections(
  customSections: HubRefineryForm["customSections"],
): Paragraph[] {
  const paras: Paragraph[] = [];
  for (const section of customSections ?? []) {
    if (!line(section.title) || !line(section.content) || section.hidden) continue;
    paras.push(sectionHeading(line(section.title)));
    for (const textLine of line(section.content).split("\n")) {
      if (line(textLine)) paras.push(bodyParagraph(line(textLine)));
    }
    paras.push(emptyLine(SPACING.betweenEntries));
  }
  return paras;
}

// ─── Numbering config ─────────────────────────────────────────────────────────

const bulletNumberingConfig = {
  config: [
    {
      reference: "bullet-list",
      levels: [
        {
          level: 0,
          format: "bullet" as const,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: dxa(SPACING.bulletIndent),
                hanging: dxa(SPACING.bulletIndent),
              },
            },
            run: {
              font: "Symbol",
              size: pt(FONT_SIZE.body),
            },
          },
        },
      ],
    },
  ],
};

// ─── Validation ───────────────────────────────────────────────────────────────

export type DocxValidationResult =
  | { valid: true }
  | { valid: false; violations: string[] };

/** Check §8 hard "never" rules on the form data before building. */
export function validateResumeForm(
  form: HubRefineryForm,
): DocxValidationResult {
  const violations: string[] = [];

  for (const entry of form.experience) {
    if (entry.hidden) continue;
    const bullets = entry.bullets
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);
    if (bullets.length > 6) {
      violations.push(
        `"${line(entry.title) || "Role"}" has ${bullets.length} bullets — max is 6 (RULES.md §8).`,
      );
    }
  }

  return violations.length === 0
    ? { valid: true }
    : { valid: false, violations };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildResumeDocx(
  form: HubRefineryForm,
  targetTitle: string,
): Promise<Uint8Array> {
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || "Applicant";

  const contact = [form.cityState, form.phone, form.email, form.linkedIn]
    .map(line)
    .filter(Boolean)
    .join(" | ");

  const children: Paragraph[] = [
    nameParagraph(name),
    ...(contact ? [contactParagraph(contact)] : []),
    ...buildSummarySection(form.professionalSummary),
    ...buildSkillsSection(form.skillsText),
    ...buildExperienceSection(form.experience),
    ...buildEducationSection(form.education),
    ...buildSimpleListSection(SECTION_TITLE.certs, form.certifications),
    ...buildSimpleListSection(SECTION_TITLE.projects, form.projects),
    ...buildSimpleListSection(SECTION_TITLE.languages, form.languages),
    ...buildCustomSections(form.customSections),
  ];

  const doc = new Document({
    title: targetTitle || name,
    creator: "EasySubmit",
    numbering: bulletNumberingConfig,
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: pt(FONT_SIZE.body),
            color: COLOR.darkGray.replace("#", ""),
          },
          paragraph: {
            spacing: { line: dxa(LINE_HEIGHT_DXA) },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: dxa(SPACING.pageMarginV),
              bottom: dxa(SPACING.pageMarginV),
              left: dxa(SPACING.pageMarginH),
              right: dxa(SPACING.pageMarginH),
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

// 240 twips = single line spacing in docx (1 line = 240 twips)
const LINE_HEIGHT_DXA = 240;
