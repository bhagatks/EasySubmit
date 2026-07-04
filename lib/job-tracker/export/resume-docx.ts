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
  DOCX_SPACING,
  dxa,
  DXA_PER_PT,
  FONT_SIZE,
  LINE_HEIGHT,
  SECTION_TITLE,
  tabStopRightDxa,
} from "@/lib/job-tracker/export/resume-style";

const S = DOCX_SPACING;

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
    spacing: { after: dxa(S.afterName) },
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
    spacing: { after: dxa(S.afterContact) },
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

function targetTitleParagraph(targetTitle: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: dxa(S.afterContact) },
    children: [
      new TextRun({
        text: targetTitle,
        bold: true,
        size: pt(FONT_SIZE.targetTitle),
        color: COLOR.nearBlack.replace("#", ""),
        font: "Calibri",
      }),
    ],
  });
}

function sectionHeading(title: string, first = false): Paragraph {
  return new Paragraph({
    spacing: {
      ...(first ? {} : { before: dxa(S.betweenSections) }),
      after: dxa(S.afterSectionRule),
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

function entryTitleLine(title: string, date: string, spacingAfter = S.afterEntryHead): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(spacingAfter) },
    tabStops: [{ type: TabStopType.RIGHT, position: tabStopRightDxa(S) }],
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

function entrySubLine(text: string, spacingAfter = S.afterEntrySub): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(spacingAfter) },
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

function bulletParagraph(text: string, spacingAfter = S.bulletGap): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(spacingAfter) },
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

function bodyParagraph(text: string, spacingAfter = S.afterSectionBody): Paragraph {
  return new Paragraph({
    spacing: { after: dxa(spacingAfter) },
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

function buildParagraphsFromContent(content: ResumeContentModel): Paragraph[] {
  const paras: Paragraph[] = [
    nameParagraph(content.name),
    ...(content.contact ? [contactParagraph(content.contact)] : []),
    ...(content.targetTitle ? [targetTitleParagraph(content.targetTitle)] : []),
  ];

  let firstSection = true;
  const pushSectionHeading = (title: string) => {
    paras.push(sectionHeading(title, firstSection));
    firstSection = false;
  };

  if (content.summary) {
    pushSectionHeading(SECTION_TITLE.summary);
    paras.push(bodyParagraph(content.summary));
  }

  if (content.skillsText) {
    pushSectionHeading(SECTION_TITLE.skills);
    paras.push(bodyParagraph(content.skillsText));
  }

  if (content.experience.length > 0) {
    pushSectionHeading(SECTION_TITLE.experience);
    for (const entry of content.experience) {
      const hasBullets = entry.bullets.length > 0;
      paras.push(
        entryTitleLine(
          entry.title,
          entry.dateRange,
          !entry.subtitle && !hasBullets ? S.betweenEntries : S.afterEntryHead,
        ),
      );
      if (entry.subtitle) {
        paras.push(
          entrySubLine(entry.subtitle, !hasBullets ? S.betweenEntries : S.afterEntrySub),
        );
      }
      for (let i = 0; i < entry.bullets.length; i++) {
        const after = i === entry.bullets.length - 1 ? S.betweenEntries : S.bulletGap;
        paras.push(bulletParagraph(entry.bullets[i], after));
      }
    }
  }

  if (content.education.length > 0) {
    pushSectionHeading(SECTION_TITLE.education);
    for (const entry of content.education) {
      const hasSubtitle = Boolean(entry.subtitle);
      paras.push(
        entryTitleLine(
          entry.title,
          entry.dateRange,
          !hasSubtitle ? S.betweenEntries : S.afterEntryHead,
        ),
      );
      if (entry.subtitle) paras.push(entrySubLine(entry.subtitle, S.betweenEntries));
    }
  }

  const listSections: Array<[string, string[]]> = [
    [SECTION_TITLE.certs, content.certifications],
    [SECTION_TITLE.projects, content.projects],
    [SECTION_TITLE.languages, content.languages],
  ];

  for (const [title, items] of listSections) {
    if (items.length === 0) continue;
    pushSectionHeading(title);
    for (let i = 0; i < items.length; i++) {
      const after = i === items.length - 1 ? S.betweenEntries : S.bulletGap;
      paras.push(bulletParagraph(items[i], after));
    }
  }

  for (const section of content.customSections) {
    pushSectionHeading(section.title);
    for (let i = 0; i < section.lines.length; i++) {
      const after = i === section.lines.length - 1 ? S.betweenEntries : S.afterSectionBody;
      paras.push(bodyParagraph(section.lines[i], after));
    }
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
                left: dxa(S.bulletIndent),
                hanging: dxa(S.bulletIndent),
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

const LINE_HEIGHT_DXA = Math.round(FONT_SIZE.body * LINE_HEIGHT * DXA_PER_PT);

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
            spacing: { line: LINE_HEIGHT_DXA },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: dxa(S.pageMarginV),
              bottom: dxa(S.pageMarginV),
              left: dxa(S.pageMarginH),
              right: dxa(S.pageMarginH),
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
