/**
 * ATS-safe PDF resume via @react-pdf/renderer.
 * Content from resume-content-model; styling from resume-style.
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
  buildResumeContentFromForm,
  type ResumeContentModel,
} from "@/lib/job-tracker/export/resume-content-model";
import {
  COLOR,
  FONT_SIZE,
  SECTION_TITLE,
  SPACING,
} from "@/lib/job-tracker/export/resume-style";

Font.registerHyphenationCallback((word) => [word]);

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
  entrySub: {
    fontSize: FONT_SIZE.entrySub,
    fontFamily: "Helvetica-Oblique",
    color: COLOR.midGray,
    marginBottom: SPACING.afterEntrySub,
  },
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
  body: {
    fontSize: FONT_SIZE.body,
    color: COLOR.darkGray,
    marginBottom: 4,
  },
  entryGroup: {
    marginBottom: SPACING.betweenEntries,
  },
});

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

function ResumeDocument({ content }: { content: ResumeContentModel }) {
  return (
    <Document title={content.targetTitle || content.name} creator="EasySubmit" producer="EasySubmit">
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{content.name}</Text>
        {content.contact ? <Text style={s.contact}>{content.contact}</Text> : null}

        {content.summary ? (
          <>
            <SectionHeading title={SECTION_TITLE.summary} />
            <Text style={s.body}>{content.summary}</Text>
          </>
        ) : null}

        {content.skillsText ? (
          <>
            <SectionHeading title={SECTION_TITLE.skills} />
            <Text style={s.body}>{content.skillsText}</Text>
          </>
        ) : null}

        {content.experience.length > 0 ? (
          <>
            <SectionHeading title={SECTION_TITLE.experience} />
            {content.experience.map((entry) => (
              <View key={entry.id} style={s.entryGroup}>
                <View style={s.entryRow}>
                  <Text style={s.entryTitle}>{entry.title}</Text>
                  {entry.dateRange ? <Text style={s.entryDate}>{entry.dateRange}</Text> : null}
                </View>
                {entry.subtitle ? <Text style={s.entrySub}>{entry.subtitle}</Text> : null}
                {entry.bullets.map((bullet, i) => (
                  <Bullet key={i} text={bullet} />
                ))}
              </View>
            ))}
          </>
        ) : null}

        {content.education.length > 0 ? (
          <>
            <SectionHeading title={SECTION_TITLE.education} />
            {content.education.map((entry) => (
              <View key={entry.id} style={s.entryGroup}>
                <View style={s.entryRow}>
                  <Text style={s.entryTitle}>{entry.title}</Text>
                  {entry.dateRange ? <Text style={s.entryDate}>{entry.dateRange}</Text> : null}
                </View>
                {entry.subtitle ? <Text style={s.entrySub}>{entry.subtitle}</Text> : null}
              </View>
            ))}
          </>
        ) : null}

        {(
          [
            { id: "certs", title: SECTION_TITLE.certs, items: content.certifications },
            { id: "projects", title: SECTION_TITLE.projects, items: content.projects },
            { id: "languages", title: SECTION_TITLE.languages, items: content.languages },
          ] as const
        ).map(({ id, title, items }) =>
          items.length > 0 ? (
            <React.Fragment key={id}>
              <SectionHeading title={title} />
              {items.map((item, i) => (
                <Bullet key={i} text={item} />
              ))}
            </React.Fragment>
          ) : null,
        )}

        {content.customSections.map((section) => (
          <React.Fragment key={section.id}>
            <SectionHeading title={section.title} />
            {section.lines.map((line, i) => (
              <Text key={i} style={s.body}>
                {line}
              </Text>
            ))}
          </React.Fragment>
        ))}
      </Page>
    </Document>
  );
}

export async function buildResumePdf(
  form: HubRefineryForm,
  targetTitle: string,
): Promise<Uint8Array> {
  const content = buildResumeContentFromForm(form, targetTitle);
  const doc = <ResumeDocument content={content} />;
  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
