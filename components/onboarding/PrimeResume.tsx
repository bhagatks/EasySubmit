"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Inter } from "next/font/google";
import {
  CONTACT_LINE_SEPARATOR,
  RESUME_SECTION_TITLES,
} from "@/lib/resume/resumeSpec";
import { getResumeFontStack } from "@/lib/resume/resume-fonts";
import type { ResumeFontId } from "@/lib/resume/resume-fonts";
import { useResumePreviewFont } from "@/components/resume/resume-preview-font-context";
import { normalizeSkillList } from "@/lib/onboarding/normalizeSkills";
import { formatLocationLabel, parseLocationLabel } from "@/lib/resume/dates";
import type { LanguageEntry } from "@/stores/onboardingStore";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const INK = "oklch(0.25 0.02 268)";
const PRIMARY = "oklch(0.62 0.21 265)";
const PAPER = "oklch(0.98 0.01 268)";
const MUTED = "oklch(0.45 0.02 268)";

/** ATS spacing rhythm — preview px @ 16px root; mirror in docx paragraph styles when export ships. */
const SPACE = {
  /** Page inset (~0.5"–1" on letter; % tracks preview width). */
  page: "px-[6%] py-[5.5%]",
  /** 20px — uniform gap between header and each section (was gap-7 / 28px). */
  sectionStack: "gap-5",
  /** 8px below heading + 4px above rule + rule → body (12px total below title text). */
  titleAfter: "mb-2 pb-1",
  /** 16px between jobs or education entries. */
  entryStack: "space-y-4",
  /** 4px between bullets or optional lines. */
  lineStack: "space-y-1",
  /** 12px between language rows. */
  languageStack: "space-y-3",
  /** 2px title row → company/school line. */
  titleToSecondary: "mt-0.5",
  /** 8px company line → bullet list. */
  secondaryToBullets: "mt-2",
} as const;

/** ATS typography — mirrors EASYSUBMIT_RESUME_RULES §2 in preview px. */
const BODY_TEXT_CLASS =
  "text-[10.5px] leading-[1.55] text-[oklch(0.25_0.02_268/0.88)]";
const SUBHEAD_BOLD_CLASS = "min-w-0 flex-1 text-[11px] font-bold leading-snug";
const SECONDARY_LINE_CLASS = cn(
  SPACE.titleToSecondary,
  "text-[10px] italic leading-snug text-[oklch(0.45_0.02_268)]",
);
const META_LINE_CLASS = "shrink-0 text-[10px] tabular-nums text-[oklch(0.45_0.02_268)]";

export type PrimeResumeExperience = {
  id?: string;
  title: string;
  company: string;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  bullets?: string[];
};

export type PrimeResumeEducation = {
  id?: string;
  school: string;
  degree?: string | null;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type PrimeResumeProfile = {
  targetRole?: string | null;
  minSalary?: number | null;
  workMode?: string | null;
};

export type PrimeResumeData = {
  profile?: PrimeResumeProfile;
  fullName?: string | null;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedIn?: string | null;
  summary?: string | null;
  skills?: string[];
  experience?: PrimeResumeExperience[];
  education?: PrimeResumeEducation[];
  certifications?: string[];
  projects?: string[];
  languages?: string[];
  ghostTagline?: string | null;
};

type PrimeResumeProps = {
  resume: PrimeResumeData;
  className?: string;
  /** When false, header matches ATS spec (name + contact only). Default false. */
  showTargetRole?: boolean;
  /** Live language vectors from global state — optional Studio section at canvas bottom. */
  languageEntries?: LanguageEntry[];
  /** Workbench: natural height, no internal scroll — pagination handled by parent. */
  variant?: "default" | "workbench";
  /** Override preview font (workbench); otherwise reads ResumePreviewFontProvider. */
  resumeFontId?: ResumeFontId;
};

const languageFade = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

function formatDateRange(
  start?: string | null,
  end?: string | null,
): string | null {
  const startTrimmed = start?.trim();
  const endTrimmed = end?.trim();

  if (startTrimmed && endTrimmed) {
    return `${startTrimmed} – ${endTrimmed}`;
  }

  return startTrimmed || endTrimmed || null;
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="italic" style={{ color: "oklch(0.72 0.02 268)" }}>
      {children}
    </span>
  );
}

function formatContactLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return "";

  const parsed = parseLocationLabel(trimmed);
  if (parsed.city && parsed.state && parsed.zip) {
    return formatLocationLabel(parsed.city, parsed.state, parsed.zip);
  }

  return trimmed.replace(/\((\d{5}(?:-\d{4})?)\)/, "& $1");
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className={cn(
        SPACE.titleAfter,
        "border-b border-[oklch(0.25_0.02_268/0.15)] text-[12px] font-bold uppercase tracking-[0.08em] text-[oklch(0.25_0.02_268)]",
      )}
    >
      {children}
    </h2>
  );
}

function ProfileHeader({
  resume,
  showTargetRole = false,
}: {
  resume: PrimeResumeData;
  showTargetRole?: boolean;
}) {
  const targetRole =
    resume.headline?.trim() || resume.profile?.targetRole?.trim() || "";

  const contactParts = [
    formatContactLocation(resume.location ?? ""),
    resume.phone?.trim(),
    resume.email?.trim(),
    resume.linkedIn?.trim(),
  ].filter(Boolean) as string[];

  return (
    <header className="text-center">
      <h1
        className="text-[20px] font-bold leading-tight tracking-tight"
        style={{ color: INK }}
      >
        {resume.fullName?.trim() || <Placeholder>Your Name</Placeholder>}
      </h1>

      {showTargetRole ? (
        targetRole ? (
          <p
            className="mt-1.5 text-[12px] font-medium leading-snug"
            style={{ color: PRIMARY }}
          >
            {targetRole}
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] font-medium leading-snug" style={{ color: MUTED }}>
            <Placeholder>Target role</Placeholder>
          </p>
        )
      ) : null}

      {contactParts.length > 0 ? (
        <p className="mt-2.5 text-[10px] leading-relaxed text-[oklch(0.45_0.02_268)]">
          {contactParts.join(CONTACT_LINE_SEPARATOR)}
        </p>
      ) : (
        <p className="mt-2.5 text-[10px] leading-relaxed" style={{ color: MUTED }}>
          <Placeholder>City, state & Zipcode | Phone | Email | LinkedIn</Placeholder>
        </p>
      )}
    </header>
  );
}

function SummarySection({ summary }: { summary?: string | null }) {
  if (!summary?.trim()) return null;

  return (
    <section>
      <SectionTitle>{RESUME_SECTION_TITLES.professionalSummary}</SectionTitle>
      <p className={BODY_TEXT_CLASS}>{summary.trim()}</p>
    </section>
  );
}

function ExperienceSection({
  experience,
}: {
  experience: PrimeResumeExperience[];
}) {
  const entries =
    experience.length > 0
      ? experience
      : [{ id: "placeholder-exp", title: "", company: "" }];

  return (
    <section>
      <SectionTitle>{RESUME_SECTION_TITLES.professionalExperience}</SectionTitle>
      <ul className={SPACE.entryStack}>
        {entries.map((entry, index) => {
          const dateRange = formatDateRange(entry.startDate, entry.endDate);
          const bullets = entry.bullets?.filter((line) => line.trim()) ?? [];
          const hasContent = Boolean(
            entry.title.trim() || entry.company.trim() || bullets.length,
          );

          if (!hasContent) {
            return (
              <li key={entry.id ?? `exp-${index}`}>
                <p className={BODY_TEXT_CLASS}>
                  <Placeholder>Experience entries will appear here</Placeholder>
                </p>
              </li>
            );
          }

          return (
            <li key={entry.id ?? `exp-${index}`} className="break-words">
              <div className="flex items-start justify-between gap-3">
                <span className={cn(SUBHEAD_BOLD_CLASS)} style={{ color: INK }}>
                  {entry.title.trim() || "Job Title"}
                </span>
                {dateRange ? (
                  <span className={META_LINE_CLASS}>{dateRange}</span>
                ) : null}
              </div>

              {(entry.company.trim() || entry.location?.trim()) ? (
                <p className={SECONDARY_LINE_CLASS}>
                  {[entry.company.trim(), entry.location?.trim()]
                    .filter(Boolean)
                    .join(" — ")}
                </p>
              ) : null}

              {bullets.length > 0 ? (
                <ul className={cn(SPACE.secondaryToBullets, "list-disc pl-4 marker:text-[oklch(0.45_0.02_268)]", SPACE.lineStack)}>
                  {bullets.map((bullet, bulletIndex) => (
                    <li
                      key={`${entry.id ?? index}-bullet-${bulletIndex}`}
                      className={BODY_TEXT_CLASS}
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EducationSection({
  education,
}: {
  education: PrimeResumeEducation[];
}) {
  const entries =
    education.length > 0 ? education : [{ id: "placeholder-edu", school: "" }];

  return (
    <section>
      <SectionTitle>{RESUME_SECTION_TITLES.education}</SectionTitle>
      <ul className={SPACE.entryStack}>
        {entries.map((entry, index) => {
          const dateRange = formatDateRange(entry.startDate, entry.endDate);
          const degreeLine = [entry.degree, entry.field]
            .filter((part) => part?.trim())
            .join(", ");
          const hasContent = Boolean(entry.school.trim() || degreeLine);

          if (!hasContent) {
            return (
              <li key={entry.id ?? `edu-${index}`}>
                <p className={BODY_TEXT_CLASS}>
                  <Placeholder>Education entries will appear here</Placeholder>
                </p>
              </li>
            );
          }

          return (
            <li key={entry.id ?? `edu-${index}`} className="break-words">
              <div className="flex items-start justify-between gap-3">
                <span className={cn(SUBHEAD_BOLD_CLASS)} style={{ color: INK }}>
                  {degreeLine || entry.school.trim() || "Degree"}
                </span>
                {dateRange ? (
                  <span className={META_LINE_CLASS}>{dateRange}</span>
                ) : null}
              </div>
              {entry.school.trim() && degreeLine ? (
                <p className={SECONDARY_LINE_CLASS}>
                  {[entry.school.trim(), entry.field?.trim()].filter(Boolean).join(" — ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SkillsSection({ skills }: { skills: string[] }) {
  const visibleSkills = normalizeSkillList(skills);
  if (visibleSkills.length === 0) return null;

  return (
    <>
      <SectionTitle>{RESUME_SECTION_TITLES.skills}</SectionTitle>
      <p className={BODY_TEXT_CLASS}>{visibleSkills.join(", ")}</p>
    </>
  );
}

function LanguagesSection({ entries }: { entries: LanguageEntry[] }) {
  const visible = entries.filter(
    (entry) => entry.name.trim().length > 0 && entry.level.trim().length > 0,
  );

  if (visible.length === 0) return null;

  return (
    <section aria-label={RESUME_SECTION_TITLES.languages}>
      <SectionTitle>{RESUME_SECTION_TITLES.languages}</SectionTitle>
      <ul className={SPACE.languageStack} role="list">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((entry) => (
            <motion.li
              key={`${entry.name.trim().toLowerCase()}-${entry.level.trim()}`}
              layout
              role="listitem"
              initial={languageFade.initial}
              animate={languageFade.animate}
              exit={languageFade.exit}
              transition={languageFade.transition}
            >
              <p
                className={cn(inter.className, "text-[11px] font-semibold leading-snug")}
                style={{ color: INK }}
              >
                {entry.name.trim()}
              </p>
              <p
                className={cn(inter.className, "mt-0.5", BODY_TEXT_CLASS)}
                style={{ color: MUTED }}
              >
                {entry.level.trim()}
              </p>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function SkillsSectionBlock({ skills }: { skills: string[] }) {
  const visibleSkills = normalizeSkillList(skills);
  if (visibleSkills.length === 0) return null;

  return (
    <section aria-label={RESUME_SECTION_TITLES.skills}>
      <SkillsSection skills={skills} />
    </section>
  );
}

function OptionalLinesSection({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  const visible = lines.filter((line) => line.trim());
  if (visible.length === 0) return null;

  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ul className={SPACE.lineStack}>
        {visible.map((line, index) => (
          <li
            key={`${title}-${index}`}
            className={cn("break-words", BODY_TEXT_CLASS)}
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** ATS-ordered resume preview — section order from {@link lib/resume/resumeSpec}. */
export function PrimeResume({
  resume,
  className,
  showTargetRole = false,
  languageEntries = [],
  variant = "default",
  resumeFontId: resumeFontIdProp,
}: PrimeResumeProps) {
  const contextFontId = useResumePreviewFont();
  const useLiveLanguages = languageEntries.length > 0;
  const legacyLanguageLines = useLiveLanguages ? [] : (resume.languages ?? []);
  const isWorkbench = variant === "workbench";
  const resumeFontId = resumeFontIdProp ?? contextFontId;
  const bodyFontFamily = isWorkbench
    ? getResumeFontStack(resumeFontId)
    : undefined;

  return (
    <div className={cn("flex w-full justify-center", className)}>
      <article
        className={cn(
          inter.className,
          "w-full rounded-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
          isWorkbench
            ? "max-w-none"
            : "max-w-[min(100%,32rem)] min-h-[min(32rem,72vh)] max-h-[min(90vh,1100px)] overflow-y-auto",
        )}
        style={{
          backgroundColor: PAPER,
          color: INK,
          ...(bodyFontFamily ? { fontFamily: bodyFontFamily } : {}),
        }}
        aria-label="Resume preview"
      >
        <div className={cn(SPACE.page, "flex flex-col", SPACE.sectionStack)}>
          <ProfileHeader resume={resume} showTargetRole={showTargetRole} />
          <SummarySection summary={resume.summary} />
          <SkillsSectionBlock skills={resume.skills ?? []} />
          <ExperienceSection experience={resume.experience ?? []} />
          <EducationSection education={resume.education ?? []} />
          <OptionalLinesSection title={RESUME_SECTION_TITLES.certifications} lines={resume.certifications ?? []} />
          <OptionalLinesSection title={RESUME_SECTION_TITLES.projects} lines={resume.projects ?? []} />
          {useLiveLanguages ? (
            <LanguagesSection entries={languageEntries} />
          ) : (
            <OptionalLinesSection
              title={RESUME_SECTION_TITLES.languages}
              lines={legacyLanguageLines}
            />
          )}
        </div>
      </article>
    </div>
  );
}
