import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  buildResumeContentFromForm,
  type ResumeContentModel,
} from "@/lib/job-tracker/export/resume-content-model";
import { escapeHtml } from "@/lib/job-tracker/export/html-escape";
import {
  COLOR,
  FONT_FAMILY_BODY,
  FONT_SIZE,
  LINE_HEIGHT,
  SECTION_TITLE,
  SPACING,
} from "@/lib/job-tracker/export/resume-style";

function sectionHtml(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section class="section"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function renderContentSections(content: ResumeContentModel): string {
  const summaryBlock = content.summary
    ? `<p class="summary">${escapeHtml(content.summary)}</p>`
    : "";

  const skillsBlock = content.skillsText
    ? `<p class="body">${escapeHtml(content.skillsText)}</p>`
    : "";

  const experienceBlock = content.experience
    .map((entry) => {
      const bullets = entry.bullets
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("");
      const subtitle = entry.subtitle ? escapeHtml(entry.subtitle) : "";
      return `<div class="entry">
        <div class="entry-head">
          <span class="entry-title">${escapeHtml(entry.title)}</span>
          ${entry.dateRange ? `<span class="entry-meta">${escapeHtml(entry.dateRange)}</span>` : ""}
        </div>
        ${subtitle ? `<p class="entry-sub">${subtitle}</p>` : ""}
        ${bullets ? `<ul>${bullets}</ul>` : ""}
      </div>`;
    })
    .join("");

  const educationBlock = content.education
    .map((entry) => {
      return `<div class="entry">
        <div class="entry-head">
          <span class="entry-title">${escapeHtml(entry.title)}</span>
          ${entry.dateRange ? `<span class="entry-meta">${escapeHtml(entry.dateRange)}</span>` : ""}
        </div>
        ${entry.subtitle ? `<p class="entry-sub">${escapeHtml(entry.subtitle)}</p>` : ""}
      </div>`;
    })
    .join("");

  const optionalLines = (items: string[], title: string): string => {
    if (items.length === 0) return "";
    return sectionHtml(
      title,
      `<ul class="lines">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
    );
  };

  const customSections = content.customSections
    .map((section) =>
      sectionHtml(
        section.title,
        section.lines
          .map((line) => `<p class="body whitespace">${escapeHtml(line)}</p>`)
          .join(""),
      ),
    )
    .join("");

  return [
    sectionHtml(SECTION_TITLE.summary, summaryBlock),
    sectionHtml(SECTION_TITLE.skills, skillsBlock),
    sectionHtml(SECTION_TITLE.experience, experienceBlock),
    sectionHtml(SECTION_TITLE.education, educationBlock),
    optionalLines(content.certifications, SECTION_TITLE.certs),
    optionalLines(content.projects, SECTION_TITLE.projects),
    optionalLines(content.languages, SECTION_TITLE.languages),
    customSections,
  ]
    .filter(Boolean)
    .join("");
}

export function buildResumePreviewHtml(form: HubRefineryForm, targetTitle: string): string {
  const content = buildResumeContentFromForm(form, targetTitle);
  const name = escapeHtml(content.name);
  const contact = escapeHtml(content.contact.replace(/\s*\|\s*/g, " · "));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: ${FONT_FAMILY_BODY};
      font-size: ${FONT_SIZE.body}pt;
      line-height: ${LINE_HEIGHT};
      color: ${COLOR.darkGray};
      margin: 0;
      padding: 0;
      background: ${COLOR.white};
    }
    .page {
      width: 100%;
      margin: 0;
      background: ${COLOR.white};
      padding: 0 2rem 1.5rem;
    }
    .toolbar-spacer {
      height: 40px;
    }
    h1 {
      font-size: ${FONT_SIZE.name}pt;
      margin: 0 0 ${SPACING.afterName}pt;
      text-align: center;
      font-weight: 700;
      color: ${COLOR.nearBlack};
    }
    .contact {
      text-align: center;
      color: ${COLOR.midGray};
      font-size: ${FONT_SIZE.contact}pt;
      margin-bottom: 20px;
    }
    .section { margin-bottom: 16px; }
    h2 {
      font-size: ${FONT_SIZE.section}pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid ${COLOR.border};
      padding-bottom: 4px;
      margin: 0 0 8px;
      color: ${COLOR.nearBlack};
    }
    .summary, .body { margin: 0; white-space: pre-wrap; }
    .entry { margin-bottom: 14px; }
    .entry-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
    }
    .entry-title { font-weight: 700; font-size: ${FONT_SIZE.entryTitle}pt; }
    .entry-meta { color: ${COLOR.midGray}; font-size: ${FONT_SIZE.contact}pt; white-space: nowrap; }
    .entry-sub { margin: 2px 0 6px; font-style: italic; color: ${COLOR.midGray}; font-size: ${FONT_SIZE.entrySub}pt; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 4px; }
    .lines { list-style: disc; }
    .whitespace { white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar-spacer" aria-hidden="true"></div>
    <h1>${name}</h1>
    ${contact ? `<div class="contact">${contact}</div>` : ""}
    ${renderContentSections(content)}
  </div>
</body>
</html>`;
}
