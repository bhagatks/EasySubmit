import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { RESUME_SECTION_TITLES } from "@/lib/resume/resumeSpec";
import { escapeHtml } from "@/lib/job-tracker/export/html-escape";

function line(value: string | null | undefined): string {
  return value?.trim() || "";
}

function formatJobDates(
  startMonth?: string | null,
  startYear?: string | null,
  endMonth?: string | null,
  endYear?: string | null,
): string {
  const start =
    startMonth?.trim() && startYear?.trim()
      ? `${startMonth.trim()} ${startYear.trim()}`
      : startYear?.trim() || "";
  const end =
    endMonth?.trim() && endYear?.trim()
      ? `${endMonth.trim()} ${endYear.trim()}`
      : endYear?.trim() || "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function sectionHtml(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section class="section"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

export function buildResumePreviewHtml(form: HubRefineryForm, targetTitle: string): string {
  const preview = refineryFormToPrimeResume(form, { targetRole: targetTitle });
  const name = escapeHtml(preview.fullName?.trim() || "Applicant");
  const contact = escapeHtml(
    [preview.location, preview.phone, preview.email, preview.linkedIn]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(" · "),
  );

  const summaryBlock = preview.summary?.trim()
    ? `<p class="summary">${escapeHtml(preview.summary)}</p>`
    : "";

  const skillsBlock =
    (preview.skills?.length ?? 0) > 0
      ? `<p class="body">${escapeHtml(preview.skills!.join(", "))}</p>`
      : "";

  const experienceBlock = form.experience
    .filter((entry) => !entry.hidden && (line(entry.title) || line(entry.company)))
    .map((entry) => {
      const title = escapeHtml(line(entry.title) || "Role");
      const company = escapeHtml(line(entry.company));
      const location = escapeHtml(line(entry.location));
      const dates = escapeHtml(
        formatJobDates(entry.startMonth, entry.startYear, entry.endMonth, entry.endYear),
      );
      const bullets = entry.bullets
        .split("\n")
        .map((bullet) => bullet.trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean)
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("");

      return `<div class="entry">
        <div class="entry-head">
          <span class="entry-title">${title}</span>
          ${dates ? `<span class="entry-meta">${dates}</span>` : ""}
        </div>
        ${company || location ? `<p class="entry-sub">${[company, location].filter(Boolean).join(" · ")}</p>` : ""}
        ${bullets ? `<ul>${bullets}</ul>` : ""}
      </div>`;
    })
    .join("");

  const educationBlock = form.education
    .filter((entry) => !entry.hidden && (line(entry.school) || line(entry.degree)))
    .map((entry) => {
      const school = escapeHtml(line(entry.school));
      const degree = escapeHtml(line(entry.degree));
      const dates = escapeHtml(
        formatJobDates(entry.startMonth, entry.startYear, entry.endMonth, entry.endYear),
      );
      return `<div class="entry">
        <div class="entry-head">
          <span class="entry-title">${degree || school}</span>
          ${dates ? `<span class="entry-meta">${dates}</span>` : ""}
        </div>
        ${degree && school ? `<p class="entry-sub">${school}</p>` : ""}
      </div>`;
    })
    .join("");

  const optionalLines = (items: string[] | undefined, title: string): string => {
    const lines = (items ?? []).map((item) => item.trim()).filter(Boolean);
    if (lines.length === 0) return "";
    return sectionHtml(
      title,
      `<ul class="lines">${lines.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
    );
  };

  const customSections = (form.customSections ?? [])
    .filter((section) => line(section.title) && line(section.content))
    .map((section) =>
      sectionHtml(
        section.title.trim(),
        `<p class="body whitespace">${escapeHtml(section.content.trim())}</p>`,
      ),
    )
    .join("");

  const sections = [
    sectionHtml(RESUME_SECTION_TITLES.professionalSummary, summaryBlock),
    sectionHtml(RESUME_SECTION_TITLES.skills, skillsBlock),
    sectionHtml(RESUME_SECTION_TITLES.professionalExperience, experienceBlock),
    sectionHtml(RESUME_SECTION_TITLES.education, educationBlock),
    optionalLines(preview.certifications, RESUME_SECTION_TITLES.certifications),
    optionalLines(preview.projects, RESUME_SECTION_TITLES.projects),
    optionalLines(preview.languages, RESUME_SECTION_TITLES.languages),
    customSections,
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1f2937;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .page {
      width: 100%;
      margin: 0;
      background: #ffffff;
      padding: 0 2rem 1.5rem;
    }
    .toolbar-spacer {
      height: 40px;
    }
    h1 {
      font-size: 18pt;
      margin: 0 0 6px;
      text-align: center;
      font-weight: 700;
    }
    .contact {
      text-align: center;
      color: #6b7280;
      font-size: 10pt;
      margin-bottom: 20px;
    }
    .section { margin-bottom: 16px; }
    h2 {
      font-size: 12pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid rgba(31, 41, 55, 0.15);
      padding-bottom: 4px;
      margin: 0 0 8px;
    }
    .summary, .body { margin: 0; white-space: pre-wrap; }
    .entry { margin-bottom: 14px; }
    .entry-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
    }
    .entry-title { font-weight: 700; font-size: 11pt; }
    .entry-meta { color: #6b7280; font-size: 10pt; white-space: nowrap; }
    .entry-sub { margin: 2px 0 6px; font-style: italic; color: #6b7280; font-size: 10pt; }
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
    ${sections}
  </div>
</body>
</html>`;
}
