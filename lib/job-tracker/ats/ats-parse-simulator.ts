/**
 * ATS Parse Simulator — reconstructs the text stream a parser would extract
 * from a resume in document (top-to-bottom) order.
 *
 * Content is built via resume-content-model so robot view matches exports.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import {
  buildResumeContentFromPrime,
  type ResumeContentModel,
} from "@/lib/job-tracker/export/resume-content-model";
import { SECTION_TITLE } from "@/lib/job-tracker/export/resume-style";
import type { AtsPlatform } from "@/lib/job-tracker/ats/platform-rules";

export type AtsTextLine = {
  text: string;
  kind: "name" | "contact" | "section" | "entry-title" | "entry-sub" | "bullet" | "body";
};

export type AtsParsedSection = {
  id: string;
  title: string;
  lines: AtsTextLine[];
};

export type AtsParseResult = {
  sections: AtsParsedSection[];
  totalChars: number;
  warnings: string[];
};

function detectFieldWarnings(
  content: ResumeContentModel,
  data: PrimeResumeData,
): string[] {
  const warnings: string[] = [...content.warnings];

  if (!content.name || content.name === "Applicant") {
    warnings.push("Name is missing — ATS may reject with no candidate name.");
  }
  if (!data.email?.trim()) {
    warnings.push("Email missing — most ATS require it to create a candidate record.");
  }
  if (!data.phone?.trim()) {
    warnings.push("Phone missing — common required field in Workday and iCIMS.");
  }
  if (!content.targetTitle && !content.summary) {
    warnings.push("No target role or summary — ATS job-title matching will have nothing to score against.");
  }
  if (content.skills.length === 0 && !content.skillsText) {
    warnings.push(
      "Skills section empty — Greenhouse and Workday weight the Skills section heavily in scorecard matching.",
    );
  }
  if (content.experience.length === 0) {
    warnings.push("No work experience — ATS will flag as unqualified for most roles.");
  }

  for (const entry of content.experience) {
    for (const bullet of entry.bullets) {
      if (bullet.length > 200) {
        warnings.push(
          `Bullet in "${entry.title}" is over 200 characters — some parsers truncate long lines.`,
        );
        break;
      }
    }
  }

  return warnings;
}

function sectionsFromContent(content: ResumeContentModel): AtsParsedSection[] {
  const sections: AtsParsedSection[] = [];

  const headerLines: AtsTextLine[] = [
    { text: content.name, kind: "name" },
  ];
  if (content.contact) headerLines.push({ text: content.contact, kind: "contact" });
  if (content.targetTitle) headerLines.push({ text: content.targetTitle, kind: "body" });
  sections.push({ id: "header", title: "Header", lines: headerLines });

  if (content.summary) {
    sections.push({
      id: "summary",
      title: SECTION_TITLE.summary,
      lines: [
        { text: SECTION_TITLE.summary.toUpperCase(), kind: "section" },
        { text: content.summary, kind: "body" },
      ],
    });
  }

  if (content.skillsText || content.skills.length > 0) {
    const skillsLine = content.skillsText || content.skills.join(", ");
    sections.push({
      id: "skills",
      title: SECTION_TITLE.skills,
      lines: [
        { text: SECTION_TITLE.skills.toUpperCase(), kind: "section" },
        { text: skillsLine, kind: "body" },
      ],
    });
  }

  if (content.experience.length > 0) {
    const lines: AtsTextLine[] = [
      { text: SECTION_TITLE.experience.toUpperCase(), kind: "section" },
    ];
    for (const entry of content.experience) {
      const titleLine = entry.dateRange ? `${entry.title}    ${entry.dateRange}` : entry.title;
      lines.push({ text: titleLine, kind: "entry-title" });
      if (entry.subtitle) lines.push({ text: entry.subtitle, kind: "entry-sub" });
      for (const bullet of entry.bullets) {
        lines.push({ text: `• ${bullet}`, kind: "bullet" });
      }
    }
    sections.push({ id: "experience", title: SECTION_TITLE.experience, lines });
  }

  if (content.education.length > 0) {
    const lines: AtsTextLine[] = [
      { text: SECTION_TITLE.education.toUpperCase(), kind: "section" },
    ];
    for (const entry of content.education) {
      const titleLine = entry.dateRange ? `${entry.title}    ${entry.dateRange}` : entry.title;
      lines.push({ text: titleLine, kind: "entry-title" });
      if (entry.subtitle) lines.push({ text: entry.subtitle, kind: "entry-sub" });
    }
    sections.push({ id: "education", title: SECTION_TITLE.education, lines });
  }

  const optionalLists: Array<{ id: string; title: string; items: string[] }> = [
    { id: "certs", title: SECTION_TITLE.certs, items: content.certifications },
    { id: "projects", title: SECTION_TITLE.projects, items: content.projects },
    { id: "languages", title: SECTION_TITLE.languages, items: content.languages },
  ];

  for (const { id, title, items } of optionalLists) {
    if (items.length === 0) continue;
    sections.push({
      id,
      title,
      lines: [
        { text: title.toUpperCase(), kind: "section" },
        ...items.map((item) => ({ text: `• ${item}`, kind: "bullet" as const })),
      ],
    });
  }

  for (const section of content.customSections) {
    sections.push({
      id: `custom-${section.id}`,
      title: section.title,
      lines: [
        { text: section.title.toUpperCase(), kind: "section" },
        ...section.lines.map((line) => ({ text: line, kind: "body" as const })),
      ],
    });
  }

  return sections;
}

export function simulateAtsParse(
  data: PrimeResumeData,
  targetTitle: string,
): AtsParseResult {
  const content = buildResumeContentFromPrime(data, targetTitle);
  const sections = sectionsFromContent(content);
  const warnings = detectFieldWarnings(content, data);
  const totalChars = sections
    .flatMap((s) => s.lines)
    .reduce((sum, l) => sum + l.text.length, 0);

  return { sections, totalChars, warnings };
}

function getPlatformWarnings(
  data: PrimeResumeData,
  content: ResumeContentModel,
  platform: AtsPlatform,
): string[] {
  const warnings: string[] = [];

  switch (platform) {
    case "workday":
      if (!data.linkedIn?.trim()) {
        warnings.push("Workday profiles link to LinkedIn — add your LinkedIn URL to improve candidate matching.");
      }
      if (content.experience.some((e) => !e.dateRange)) {
        warnings.push("Workday expects dates on all roles — add start and end dates to every position.");
      }
      break;
    case "taleo":
      if (content.experience.some((e) => !e.dateRange)) {
        warnings.push("Taleo (Oracle) requires dates on all positions — missing dates may cause parse failures.");
      }
      break;
    case "icims":
      if (!data.linkedIn?.trim()) {
        warnings.push("iCIMS candidate profiles pull from LinkedIn — add your LinkedIn URL.");
      }
      break;
    case "greenhouse":
      if (content.summary && content.summary.length < 50) {
        warnings.push("Greenhouse weights the summary heavily — expand to at least 2 sentences for better keyword density.");
      }
      break;
    case "lever": {
      const bulletCount = content.experience.reduce((sum, e) => sum + e.bullets.length, 0);
      if (bulletCount < 4) {
        warnings.push("Lever scores achievement framing — add at least 4 strong achievement bullets across your experience.");
      }
      break;
    }
  }

  return warnings;
}

export function simulateAtsParsePlatform(
  data: PrimeResumeData,
  targetTitle: string,
  platform: AtsPlatform,
): AtsParseResult {
  const base = simulateAtsParse(data, targetTitle);
  if (platform === "unknown") return base;
  const content = buildResumeContentFromPrime(data, targetTitle);
  const platformWarnings = getPlatformWarnings(data, content, platform);
  return { ...base, warnings: [...base.warnings, ...platformWarnings] };
}
