/**
 * ATS Parse Simulator — reconstructs the text stream a parser would extract
 * from a resume in document (top-to-bottom) order.
 *
 * Why this matters: ATS systems don't render the resume visually.
 * They pull raw text and run regex / tokenizers over it. Showing users
 * this "robot view" exposes ordering issues, missing fields, and
 * garbled sections before they hit a real parser.
 */

import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import { SECTION_TITLE } from "@/lib/job-tracker/export/resume-style";

export type AtsTextLine = {
  text: string;
  /** Hint for display — drives color/indent in the UI. */
  kind: "name" | "contact" | "section" | "entry-title" | "entry-sub" | "bullet" | "body";
};

export type AtsParsedSection = {
  id: string;
  title: string;
  lines: AtsTextLine[];
};

export type AtsParseResult = {
  /** Ordered sections exactly as ATS reads them top-to-bottom. */
  sections: AtsParsedSection[];
  /** Total character count of extracted text. */
  totalChars: number;
  /** Warnings about content that may confuse parsers. */
  warnings: string[];
};

function trimmed(v: string | null | undefined): string {
  return v?.trim() ?? "";
}

function contactLine(data: PrimeResumeData): string {
  return [data.location, data.phone, data.email, data.linkedIn]
    .map(trimmed)
    .filter(Boolean)
    .join(" | ");
}

function detectWarnings(data: PrimeResumeData, targetTitle: string): string[] {
  const warnings: string[] = [];

  if (!trimmed(data.fullName)) warnings.push("Name is missing — ATS may reject with no candidate name.");
  if (!trimmed(data.email)) warnings.push("Email missing — most ATS require it to create a candidate record.");
  if (!trimmed(data.phone)) warnings.push("Phone missing — common required field in Workday and iCIMS.");
  if (!trimmed(targetTitle) && !trimmed(data.summary)) {
    warnings.push("No target role or summary — ATS job-title matching will have nothing to score against.");
  }
  if ((data.skills?.length ?? 0) === 0) {
    warnings.push("Skills section empty — Greenhouse and Workday weight the Skills section heavily in scorecard matching.");
  }
  if ((data.experience?.filter((e) => trimmed(e.title))?.length ?? 0) === 0) {
    warnings.push("No work experience — ATS will flag as unqualified for most roles.");
  }

  // Check for overly long bullets (>200 chars) — some parsers truncate
  for (const exp of data.experience ?? []) {
    for (const bullet of exp.bullets ?? []) {
      if (trimmed(bullet).length > 200) {
        warnings.push(`Bullet in "${trimmed(exp.title)}" is over 200 characters — some parsers truncate long lines.`);
        break;
      }
    }
  }

  return warnings;
}

export function simulateAtsParse(
  data: PrimeResumeData,
  targetTitle: string,
): AtsParseResult {
  const sections: AtsParsedSection[] = [];
  const warnings = detectWarnings(data, targetTitle);

  // ── Header ──────────────────────────────────────────────────────────────────
  const headerLines: AtsTextLine[] = [];
  const name = trimmed(data.fullName) || "APPLICANT NAME MISSING";
  headerLines.push({ text: name, kind: "name" });

  const contact = contactLine(data);
  if (contact) headerLines.push({ text: contact, kind: "contact" });
  if (targetTitle) headerLines.push({ text: targetTitle, kind: "body" });

  sections.push({ id: "header", title: "Header", lines: headerLines });

  // ── Professional Summary ───────────────────────────────────────────────────
  const summary = trimmed(data.summary);
  if (summary) {
    sections.push({
      id: "summary",
      title: SECTION_TITLE.summary,
      lines: [
        { text: SECTION_TITLE.summary.toUpperCase(), kind: "section" },
        { text: summary, kind: "body" },
      ],
    });
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  const skills = (data.skills ?? []).map(trimmed).filter(Boolean);
  if (skills.length > 0) {
    sections.push({
      id: "skills",
      title: SECTION_TITLE.skills,
      lines: [
        { text: SECTION_TITLE.skills.toUpperCase(), kind: "section" },
        { text: skills.join(", "), kind: "body" },
      ],
    });
  }

  // ── Professional Experience ────────────────────────────────────────────────
  const experiences = (data.experience ?? []).filter(
    (e) => trimmed(e.title) || trimmed(e.company),
  );
  if (experiences.length > 0) {
    const lines: AtsTextLine[] = [
      { text: SECTION_TITLE.experience.toUpperCase(), kind: "section" },
    ];
    for (const exp of experiences) {
      const title = trimmed(exp.title) || "Role";
      const date = [trimmed(exp.startDate), trimmed(exp.endDate)].filter(Boolean).join(" – ");
      lines.push({ text: date ? `${title}    ${date}` : title, kind: "entry-title" });

      const sub = [trimmed(exp.company), trimmed(exp.location ?? "")].filter(Boolean).join(", ");
      if (sub) lines.push({ text: sub, kind: "entry-sub" });

      for (const bullet of exp.bullets ?? []) {
        const text = trimmed(bullet).replace(/^[-•*]\s*/, "");
        if (text) lines.push({ text: `• ${text}`, kind: "bullet" });
      }
    }
    sections.push({ id: "experience", title: SECTION_TITLE.experience, lines });
  }

  // ── Education ─────────────────────────────────────────────────────────────
  const educations = (data.education ?? []).filter((e) => trimmed(e.school) || trimmed(e.degree ?? ""));
  if (educations.length > 0) {
    const lines: AtsTextLine[] = [
      { text: SECTION_TITLE.education.toUpperCase(), kind: "section" },
    ];
    for (const edu of educations) {
      const title = trimmed(edu.degree ?? "") || trimmed(edu.school);
      const date = [trimmed(edu.startDate ?? ""), trimmed(edu.endDate ?? "")].filter(Boolean).join(" – ");
      lines.push({ text: date ? `${title}    ${date}` : title, kind: "entry-title" });
      if (trimmed(edu.degree ?? "") && trimmed(edu.school)) {
        lines.push({ text: trimmed(edu.school), kind: "entry-sub" });
      }
    }
    sections.push({ id: "education", title: SECTION_TITLE.education, lines });
  }

  // ── Optional sections ──────────────────────────────────────────────────────
  const optionalMap: Array<{ id: string; title: string; items: string[] | undefined }> = [
    { id: "certs", title: SECTION_TITLE.certs, items: data.certifications },
    { id: "projects", title: SECTION_TITLE.projects, items: data.projects },
    { id: "languages", title: SECTION_TITLE.languages, items: data.languages },
  ];

  for (const { id, title, items } of optionalMap) {
    const visible = (items ?? []).map(trimmed).filter(Boolean);
    if (visible.length === 0) continue;
    sections.push({
      id,
      title,
      lines: [
        { text: title.toUpperCase(), kind: "section" },
        ...visible.map((item) => ({ text: `• ${item}`, kind: "bullet" as const })),
      ],
    });
  }

  // ── Custom sections ────────────────────────────────────────────────────────
  for (const section of data.customSections ?? []) {
    if (!trimmed(section.title) || !trimmed(section.content)) continue;
    const bodyLines = trimmed(section.content).split("\n").filter(Boolean);
    sections.push({
      id: `custom-${section.title}`,
      title: section.title,
      lines: [
        { text: trimmed(section.title).toUpperCase(), kind: "section" },
        ...bodyLines.map((l) => ({ text: l, kind: "body" as const })),
      ],
    });
  }

  const totalChars = sections
    .flatMap((s) => s.lines)
    .reduce((sum, l) => sum + l.text.length, 0);

  return { sections, totalChars, warnings };
}
