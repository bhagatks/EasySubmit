/**
 * ATS-safe Word (.docx) resume generator.
 * Content from resume-content-model; styling from resume-style.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  buildResumeContentFromForm,
  type ResumeContentModel,
  validateResumeForm,
} from "@/lib/job-tracker/export/resume-content-model";
import {
  COLOR,
  dxa,
  FONT_SIZE,
  SECTION_TITLE,
  SPACING,
  TAB_STOP_RIGHT_DXA,
} from "@/lib/job-tracker/export/resume-style";

export type DocxValidationResult =
  | { valid: true }
  | { valid: false; violations: string[] };

export { validateResumeForm };

function pt(size: number) {
  return size * 2;
}

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
        size: 4,
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

function buildParagraphsFromContent(content: ResumeContentModel): Paragraph[] {
  const paras: Paragraph[] = [
    nameParagraph(content.name),
    ...(content.contact ? [contactParagraph(content.contact)] : []),
  ];

  if (content.summary) {
    paras.push(sectionHeading(SECTION_TITLE.summary), bodyParagraph(content.summary));
  }

  if (content.skillsText) {
    paras.push(sectionHeading(SECTION_TITLE.skills), bodyParagraph(content.skillsText));
  }

  if (content.experience.length > 0) {
    paras.push(sectionHeading(SECTION_TITLE.experience));
    for (const entry of content.experience) {
      paras.push(entryTitleLine(entry.title, entry.dateRange));
      if (entry.subtitle) paras.push(entrySubLine(entry.subtitle));
      for (const bullet of entry.bullets) paras.push(bulletParagraph(bullet));
      paras.push(emptyLine(SPACING.betweenEntries));
    }
  }

  if (content.education.length > 0) {
    paras.push(sectionHeading(SECTION_TITLE.education));
    for (const entry of content.education) {
      paras.push(entryTitleLine(entry.title, entry.dateRange));
      if (entry.subtitle) paras.push(entrySubLine(entry.subtitle));
      paras.push(emptyLine(SPACING.betweenEntries));
    }
  }

  const listSections: Array<[string, string[]]> = [
    [SECTION_TITLE.certs, content.certifications],
    [SECTION_TITLE.projects, content.projects],
    [SECTION_TITLE.languages, content.languages],
  ];

  for (const [title, items] of listSections) {
    if (items.length === 0) continue;
    paras.push(sectionHeading(title), ...items.map((item) => bulletParagraph(item)));
    paras.push(emptyLine(SPACING.betweenEntries));
  }

  for (const section of content.customSections) {
    paras.push(sectionHeading(section.title));
    for (const textLine of section.lines) paras.push(bodyParagraph(textLine));
    paras.push(emptyLine(SPACING.betweenEntries));
  }

  return paras;
}

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

const LINE_HEIGHT_DXA = 240;

export async function buildResumeDocx(
  form: HubRefineryForm,
  targetTitle: string,
): Promise<Uint8Array> {
  const content = buildResumeContentFromForm(form, targetTitle);

  const doc = new Document({
    title: content.targetTitle || content.name,
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
        children: buildParagraphsFromContent(content),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
