import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import {
  CONTACT_LINE_SEPARATOR,
  RESUME_SECTION_TITLES,
} from "@/lib/resume/resumeSpec";
import { formatLocationLabel, parseLocationLabel } from "@/lib/resume/dates";
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
    <h2 className="mb-3 mt-7 border-b border-[oklch(0.25_0.02_268/0.15)] pb-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[oklch(0.25_0.02_268)] first:mt-0">
      {children}
    </h2>
  );
}

function ProfileHeader({ resume }: { resume: PrimeResumeData }) {
  const contactParts = [
    formatContactLocation(resume.location ?? ""),
    resume.phone?.trim(),
    resume.email?.trim(),
    resume.linkedIn?.trim(),
  ].filter(Boolean) as string[];

  return (
    <header className="mb-6">
      <h1
        className="text-[20px] font-bold leading-tight tracking-tight"
        style={{ color: INK }}
      >
        {resume.fullName?.trim() || <Placeholder>Your Name</Placeholder>}
      </h1>

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
      <p className="text-[12px] leading-relaxed text-[oklch(0.25_0.02_268/0.88)]">
        {summary.trim()}
      </p>
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
      <ul className="space-y-6">
        {entries.map((entry, index) => {
          const dateRange = formatDateRange(entry.startDate, entry.endDate);
          const bullets = entry.bullets?.filter((line) => line.trim()) ?? [];
          const hasContent = Boolean(
            entry.title.trim() || entry.company.trim() || bullets.length,
          );

          if (!hasContent) {
            return (
              <li key={entry.id ?? `exp-${index}`}>
                <p className="text-[12px]">
                  <Placeholder>Experience entries will appear here</Placeholder>
                </p>
              </li>
            );
          }

          return (
            <li key={entry.id ?? `exp-${index}`} className="break-words">
              <div className="flex items-start justify-between gap-3">
                <span
                  className="min-w-0 flex-1 text-[11px] font-bold leading-snug"
                  style={{ color: INK }}
                >
                  {entry.title.trim() || "Job Title"}
                </span>
                {dateRange ? (
                  <span className="shrink-0 text-[10px] tabular-nums text-[oklch(0.45_0.02_268)]">
                    {dateRange}
                  </span>
                ) : null}
              </div>

              {(entry.company.trim() || entry.location?.trim()) ? (
                <p className="mt-0.5 text-[10px] italic leading-snug text-[oklch(0.45_0.02_268)]">
                  {[entry.company.trim(), entry.location?.trim()]
                    .filter(Boolean)
                    .join(" — ")}
                </p>
              ) : null}

              {bullets.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 marker:text-[oklch(0.45_0.02_268)]">
                  {bullets.map((bullet, bulletIndex) => (
                    <li
                      key={`${entry.id ?? index}-bullet-${bulletIndex}`}
                      className="text-[10.5px] leading-[1.55] text-[oklch(0.25_0.02_268/0.88)]"
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
      <ul className="space-y-4">
        {entries.map((entry, index) => {
          const dateRange = formatDateRange(entry.startDate, entry.endDate);
          const degreeLine = [entry.degree, entry.field]
            .filter((part) => part?.trim())
            .join(", ");
          const hasContent = Boolean(entry.school.trim() || degreeLine);

          if (!hasContent) {
            return (
              <li key={entry.id ?? `edu-${index}`}>
                <p className="text-[12px]">
                  <Placeholder>Education entries will appear here</Placeholder>
                </p>
              </li>
            );
          }

          return (
            <li key={entry.id ?? `edu-${index}`} className="break-words">
              <div className="flex items-start justify-between gap-3">
                <span
                  className="min-w-0 flex-1 text-[11px] font-bold leading-snug"
                  style={{ color: INK }}
                >
                  {degreeLine || entry.school.trim() || "Degree"}
                </span>
                {dateRange ? (
                  <span className="shrink-0 text-[10px] tabular-nums text-[oklch(0.45_0.02_268)]">
                    {dateRange}
                  </span>
                ) : null}
              </div>
              {entry.school.trim() && degreeLine ? (
                <p className="mt-0.5 text-[10px] italic leading-snug text-[oklch(0.45_0.02_268)]">
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
  const visibleSkills = skills.filter((skill) => skill.trim());
  if (visibleSkills.length === 0) return null;

  return (
    <section>
      <SectionTitle>{RESUME_SECTION_TITLES.skills}</SectionTitle>
      <p className="text-[10.5px] leading-relaxed text-[oklch(0.25_0.02_268/0.85)]">
        {visibleSkills.join(", ")}
      </p>
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
      <ul className="space-y-1.5">
        {visible.map((line, index) => (
          <li
            key={`${title}-${index}`}
            className="break-words text-[10.5px] leading-relaxed text-[oklch(0.25_0.02_268/0.88)]"
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** ATS-ordered resume preview — section order from {@link lib/resume/resumeSpec}. */
export function PrimeResume({ resume, className }: PrimeResumeProps) {
  return (
    <div className={cn("flex w-full justify-center", className)}>
      <article
        className={cn(
          inter.className,
          "w-full max-w-[min(100%,32rem)] min-h-[min(32rem,72vh)] max-h-[min(90vh,1100px)] overflow-y-auto rounded-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
        )}
        style={{ backgroundColor: PAPER, color: INK }}
        aria-label="Resume preview"
      >
        <div className="px-[6%] py-[5.5%]">
          <ProfileHeader resume={resume} />
          <SummarySection summary={resume.summary} />
          <SkillsSection skills={resume.skills ?? []} />
          <ExperienceSection experience={resume.experience ?? []} />
          <EducationSection education={resume.education ?? []} />
          <OptionalLinesSection title={RESUME_SECTION_TITLES.certifications} lines={resume.certifications ?? []} />
          <OptionalLinesSection title={RESUME_SECTION_TITLES.projects} lines={resume.projects ?? []} />
          <OptionalLinesSection title={RESUME_SECTION_TITLES.languages} lines={resume.languages ?? []} />
        </div>
      </article>
    </div>
  );
}
