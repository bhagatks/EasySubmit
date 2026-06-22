/**
 * ATS-safe PDF resume via @react-pdf/renderer.
 * Mirrors buildResumePreviewHtml visually (same font sizes, spacing, section
 * borders) while producing a real, text-searchable, single-column PDF.
 * Rules reference: docs/resume/RULES.md
 */

import {
  Document,
  Font,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import React from "react";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  COLOR,
  FONT_SIZE,
  SECTION_TITLE,
  SPACING,
} from "@/lib/job-tracker/export/resume-style";

// ─── Fonts ────────────────────────────────────────────────────────────────────
// Helvetica is built into @react-pdf — no registration needed, always embeds
// cleanly, passes every ATS parser. Matches the preview's system-ui stack.

Font.registerHyphenationCallback((word) => [word]); // disable hyphenation

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: FONT_SIZE.body,
    lineHeight: 1.3,
    color: COLOR.darkGray,
    paddingTop: SPACING.pageMarginV,
    paddingBottom: SPACING.pageMarginV,
    paddingLeft: SPACING.pageMarginH,
    paddingRight: SPACING.pageMarginH,
    backgroundColor: COLOR.white,
  },

  // Header
  name: {
    fontSize: FONT_SIZE.name,
    fontFamily: "Helvetica-Bold",
    color: COLOR.nearBlack,
    textAlign: "center",
    marginBottom: SPACING.afterName,
  },
  contact: {
    fontSize: FONT_SIZE.contact,
    color: COLOR.midGray,
    textAlign: "center",
    marginBottom: SPACING.afterContact,
  },

  // Section heading + bottom border
  sectionWrapper: {
    marginTop: SPACING.betweenSections,
    marginBottom: SPACING.afterSectionRule,
    borderBottomWidth: 0.75,
    borderBottomColor: COLOR.border,
    borderBottomStyle: "solid",
    paddingBottom: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.section,
    fontFamily: "Helvetica-Bold",
    color: COLOR.nearBlack,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Entry: title + date row
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: SPACING.afterEntryHead,
  },
  entryTitle: {
    fontSize: FONT_SIZE.entryTitle,
    fontFamily: "Helvetica-Bold",
    color: COLOR.nearBlack,
    flexShrink: 1,
  },
  entryDate: {
    fontSize: FONT_SIZE.contact,
    color: COLOR.midGray,
    flexShrink: 0,
    marginLeft: 8,
  },

  // Company / institution sub-line
  entrySub: {
    fontSize: FONT_SIZE.entrySub,
    fontFamily: "Helvetica-Oblique",
    color: COLOR.midGray,
    marginBottom: SPACING.afterEntrySub,
  },

  // Bullet
  bulletRow: {
    flexDirection: "row",
    marginBottom: SPACING.bulletGap,
    paddingLeft: SPACING.bulletIndent,
  },
  bulletDot: {
    fontSize: FONT_SIZE.body,
    color: COLOR.darkGray,
    width: SPACING.bulletIndent,
    marginLeft: -SPACING.bulletIndent,
  },
  bulletText: {
    fontSize: FONT_SIZE.body,
    color: COLOR.darkGray,
    flex: 1,
  },

  // Body (summary, skills, custom)
  body: {
    fontSize: FONT_SIZE.body,
    color: COLOR.darkGray,
    marginBottom: 4,
  },

  // Entry group spacer
  entryGroup: {
    marginBottom: SPACING.betweenEntries,
  },
});

// ─── Component helpers ────────────────────────────────────────────────────────

function line(v: string | null | undefined): string {
  return v?.trim() ?? "";
}

function formatDateRange(
  startMonth: string,
  startYear: string,
  endMonth: string,
  endYear: string,
): string {
  const start = [startMonth, startYear].map(line).filter(Boolean).join(" ");
  const end = [endMonth, endYear].map(line).filter(Boolean).join(" ");
  if (start && end) return `${start} – ${end}`; // en-dash
  return start || end;
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={s.sectionWrapper}>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>{"•"}</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function ExperienceEntry({ entry }: { entry: HubRefineryForm["experience"][0] }) {
  const title = line(entry.title) || "Role";
  const date = formatDateRange(entry.startMonth, entry.startYear, entry.endMonth, entry.endYear);
  const sub = [line(entry.company), line(entry.location)].filter(Boolean).join(" – ");
  const bullets = entry.bullets
    .split("\n")
    .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .slice(0, 6);

  return (
    <View style={s.entryGroup}>
      <View style={s.entryRow}>
        <Text style={s.entryTitle}>{title}</Text>
        {date ? <Text style={s.entryDate}>{date}</Text> : null}
      </View>
      {sub ? <Text style={s.entrySub}>{sub}</Text> : null}
      {bullets.map((b, i) => <Bullet key={i} text={b} />)}
    </View>
  );
}

function EducationEntry({ entry }: { entry: HubRefineryForm["education"][0] }) {
  const title = line(entry.degree) || line(entry.school);
  const date = formatDateRange(entry.startMonth, entry.startYear, entry.endMonth, entry.endYear);
  const sub =
    line(entry.degree) && line(entry.school)
      ? [line(entry.school), line(entry.location)].filter(Boolean).join(", ")
      : line(entry.location);

  return (
    <View style={s.entryGroup}>
      <View style={s.entryRow}>
        <Text style={s.entryTitle}>{title}</Text>
        {date ? <Text style={s.entryDate}>{date}</Text> : null}
      </View>
      {sub ? <Text style={s.entrySub}>{sub}</Text> : null}
    </View>
  );
}

function SimpleListSection({
  title,
  items,
}: {
  title: string;
  items: Array<{ text: string; hidden?: boolean }>;
}) {
  const visible = items.filter((i) => !i.hidden && line(i.text));
  if (visible.length === 0) return null;
  return (
    <>
      <SectionHeading title={title} />
      {visible.map((item, i) => <Bullet key={i} text={line(item.text)} />)}
    </>
  );
}

// ─── Resume document ──────────────────────────────────────────────────────────

function ResumeDocument({
  form,
  targetTitle,
}: {
  form: HubRefineryForm;
  targetTitle: string;
}) {
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || "Applicant";
  const contact = [form.cityState, form.phone, form.email, form.linkedIn]
    .map(line)
    .filter(Boolean)
    .join("  |  ");

  const experiences = form.experience.filter(
    (e) => !e.hidden && (line(e.title) || line(e.company)),
  );
  const educations = form.education.filter(
    (e) => !e.hidden && (line(e.degree) || line(e.school)),
  );
  const summary = line(form.professionalSummary);
  const skills = line(form.skillsText);

  const customSections = (form.customSections ?? []).filter(
    (s) => !s.hidden && line(s.title) && line(s.content),
  );

  return (
    <Document title={targetTitle || name} creator="EasySubmit" producer="EasySubmit">
      <Page size="LETTER" style={s.page}>
        {/* ── Header ── */}
        <Text style={s.name}>{name}</Text>
        {contact ? <Text style={s.contact}>{contact}</Text> : null}

        {/* ── Professional Summary ── */}
        {summary ? (
          <>
            <SectionHeading title={SECTION_TITLE.summary} />
            <Text style={s.body}>{summary}</Text>
          </>
        ) : null}

        {/* ── Skills ── */}
        {skills ? (
          <>
            <SectionHeading title={SECTION_TITLE.skills} />
            <Text style={s.body}>{skills}</Text>
          </>
        ) : null}

        {/* ── Professional Experience ── */}
        {experiences.length > 0 ? (
          <>
            <SectionHeading title={SECTION_TITLE.experience} />
            {experiences.map((e) => <ExperienceEntry key={e.id} entry={e} />)}
          </>
        ) : null}

        {/* ── Education ── */}
        {educations.length > 0 ? (
          <>
            <SectionHeading title={SECTION_TITLE.education} />
            {educations.map((e) => <EducationEntry key={e.id} entry={e} />)}
          </>
        ) : null}

        {/* ── Optional sections ── */}
        <SimpleListSection title={SECTION_TITLE.certs} items={form.certifications} />
        <SimpleListSection title={SECTION_TITLE.projects} items={form.projects} />
        <SimpleListSection title={SECTION_TITLE.languages} items={form.languages} />

        {/* ── Custom sections ── */}
        {customSections.map((section) => (
          <React.Fragment key={section.id}>
            <SectionHeading title={line(section.title)} />
            {line(section.content)
              .split("\n")
              .filter(Boolean)
              .map((l, i) => <Text key={i} style={s.body}>{l}</Text>)}
          </React.Fragment>
        ))}
      </Page>
    </Document>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildResumePdf(
  form: HubRefineryForm,
  targetTitle: string,
): Promise<Uint8Array> {
  const doc = <ResumeDocument form={form} targetTitle={targetTitle} />;
  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
