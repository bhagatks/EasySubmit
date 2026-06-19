import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { StructuredResume } from "@/lib/resume/heuristicParser";
import type { PrimeResumeData } from "@/lib/resume/refineryForm";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

type PrimeResumeProps = {
  data: PrimeResumeData | StructuredResume;
  className?: string;
};

type SkillCategory = {
  label: string;
  items: string[];
};

const SKILL_CATEGORY_RULES: { label: string; pattern: RegExp }[] = [
  {
    label: "Architecture",
    pattern:
      /aws|azure|gcp|cloud|kubernetes|k8s|docker|terraform|architecture|microservices|system design|infra|nginx|lambda|vpc|helm/i,
  },
  {
    label: "AI/SDLC",
    pattern:
      /\bai\b|ml|machine learning|deep learning|openai|langchain|llm|nlp|pytorch|tensorflow|agile|scrum|kanban|ci\/cd|devops|sdlc|cypress|jest|playwright|testing|pytest/i,
  },
  {
    label: "Languages",
    pattern:
      /javascript|typescript|python|java|go\b|golang|rust|ruby|php|swift|kotlin|c\+\+|c#|sql|html|css|scala|r\b/i,
  },
  {
    label: "Frontend",
    pattern:
      /react|next\.?js|vue|angular|svelte|tailwind|webpack|vite|figma|redux|zustand|graphql|rest\b/i,
  },
  {
    label: "Data",
    pattern:
      /postgres|mysql|mongo|redis|elasticsearch|snowflake|spark|pandas|numpy|kafka|airflow|dbt|bigquery|sql/i,
  },
];

function categorizeSkills(skills: string[]): SkillCategory[] {
  const buckets = new Map<string, string[]>();
  const uncategorized: string[] = [];

  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;

    const match = SKILL_CATEGORY_RULES.find(({ pattern }) => pattern.test(trimmed));
    if (match) {
      const existing = buckets.get(match.label) ?? [];
      existing.push(trimmed);
      buckets.set(match.label, existing);
    } else {
      uncategorized.push(trimmed);
    }
  }

  if (uncategorized.length > 0) {
    buckets.set("Engineering", uncategorized);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({
    label,
    items,
  }));
}

function buildContactRow(data: PrimeResumeData | StructuredResume): string[] {
  return [data.email, data.phone].filter((value): value is string => Boolean(value?.trim()));
}

function getJobTitle(data: PrimeResumeData | StructuredResume): string | null {
  if ("jobTitle" in data && data.jobTitle?.trim()) {
    return data.jobTitle.trim();
  }
  return null;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 mt-9 text-[10px] font-semibold uppercase tracking-[0.22em] text-[oklch(0.25_0.02_268/0.5)] first:mt-0">
      {children}
    </h2>
  );
}

function ResumeHeader({ data }: { data: PrimeResumeData | StructuredResume }) {
  const contact = buildContactRow(data);
  const jobTitle = getJobTitle(data);

  return (
    <header className="mb-8">
      <h1 className="text-[1.75rem] font-bold leading-none tracking-tight text-[oklch(0.25_0.02_268)]">
        {data.name?.trim() || "Your Name"}
      </h1>

      {jobTitle ? (
        <p className="mt-2 text-[13px] italic text-primary">{jobTitle}</p>
      ) : null}

      <div className="mt-3 h-px w-full bg-primary" aria-hidden="true" />

      {contact.length > 0 ? (
        <p
          className={cn(
            jetbrainsMono.className,
            "mt-3 text-[9px] uppercase tracking-[0.12em] text-[oklch(0.25_0.02_268/0.65)]",
          )}
        >
          {contact.join("  |  ")}
        </p>
      ) : null}
    </header>
  );
}

function ExperienceSection({
  experience,
}: {
  experience: StructuredResume["experience"];
}) {
  if (experience.length === 0) return null;

  return (
    <section>
      <SectionTitle>Experience</SectionTitle>
      <ul className="space-y-6">
        {experience.map((entry, index) => (
          <li key={`${entry.company}-${entry.role}-${index}`}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] font-bold text-[oklch(0.25_0.02_268)]">
                {entry.company || "Company"}
              </span>
              {entry.date ? (
                <span
                  className={cn(
                    jetbrainsMono.className,
                    "shrink-0 text-[9px] tabular-nums tracking-wide text-[oklch(0.25_0.02_268/0.55)]",
                  )}
                >
                  {entry.date}
                </span>
              ) : null}
            </div>

            {entry.role ? (
              <p className="mt-0.5 text-[12px] italic text-primary">{entry.role}</p>
            ) : null}

            {entry.description.length > 0 ? (
              <ul className="mt-2.5 space-y-1.5">
                {entry.description.map((line, bulletIndex) => (
                  <li
                    key={`${index}-bullet-${bulletIndex}`}
                    className="flex gap-2 text-[12px] leading-[1.55] text-[oklch(0.25_0.02_268/0.88)]"
                  >
                    <span
                      className={cn(
                        jetbrainsMono.className,
                        "mt-[0.35em] shrink-0 text-[8px] leading-none text-[oklch(0.25_0.02_268/0.35)]",
                      )}
                      aria-hidden="true"
                    >
                      |
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EducationSection({
  education,
}: {
  education: StructuredResume["education"];
}) {
  if (education.length === 0) return null;

  return (
    <section>
      <SectionTitle>Education</SectionTitle>
      <ul className="space-y-4">
        {education.map((entry, index) => (
          <li key={`${entry.school}-${index}`}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] font-bold text-[oklch(0.25_0.02_268)]">
                {entry.school || "Institution"}
              </span>
              {entry.date ? (
                <span
                  className={cn(
                    jetbrainsMono.className,
                    "shrink-0 text-[9px] tabular-nums tracking-wide text-[oklch(0.25_0.02_268/0.55)]",
                  )}
                >
                  {entry.date}
                </span>
              ) : null}
            </div>
            {entry.degree ? (
              <p className="mt-0.5 text-[12px] italic text-primary">{entry.degree}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SkillsSection({ skills }: { skills: string[] }) {
  const categories = categorizeSkills(skills);
  if (categories.length === 0) return null;

  return (
    <section>
      <SectionTitle>Skills</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map(({ label, items }) => (
          <div key={label}>
            <p
              className={cn(
                jetbrainsMono.className,
                "mb-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-[oklch(0.25_0.02_268/0.45)]",
              )}
            >
              {label}
            </p>
            <p className="text-[11px] leading-relaxed text-[oklch(0.25_0.02_268/0.85)]">
              {items.map((skill, index) => (
                <span key={skill}>
                  {index > 0 ? (
                    <span
                      className={cn(
                        jetbrainsMono.className,
                        "mx-1.5 text-[9px] text-[oklch(0.25_0.02_268/0.3)]",
                      )}
                    >
                      |
                    </span>
                  ) : null}
                  {skill}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * "World's Best Resume" — single-column Executive Modernist layout.
 * Renders structured parser output as one continuous scrollable document.
 */
export function PrimeResume({ data, className }: PrimeResumeProps) {
  return (
    <div className={cn("flex w-full justify-center", className)}>
      <article
        className={cn(
          inter.className,
          "resume-paper relative box-border min-h-0 w-full max-w-[210mm] px-[14mm] py-[16mm]",
        )}
        aria-label="Resume"
      >
        <ResumeHeader data={data} />
        <ExperienceSection experience={data.experience} />
        <EducationSection education={data.education} />
        <SkillsSection skills={data.skills} />
      </article>
    </div>
  );
}
