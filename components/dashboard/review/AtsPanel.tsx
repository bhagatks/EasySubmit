"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { simulateAtsParse } from "@/lib/job-tracker/ats/ats-parse-simulator";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import { analyzeKeywordGap } from "@/lib/job-tracker/ats/keyword-gap";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import { cn } from "@/lib/utils";

type AtsPanelProps = {
  entry: JobTrackerDetail;
};

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color =
    score >= 90 ? "#34d399" : score >= 75 ? "#60a5fa" : score >= 60 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-border/40" />
        <circle
          cx="48" cy="48" r={radius} fill="none" strokeWidth="7"
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="text-center">
        <p className="font-display text-2xl font-bold leading-none text-foreground">{score}</p>
        <p className="mt-0.5 text-xs font-semibold" style={{ color }}>{grade}</p>
      </div>
    </div>
  );
}

// ─── Pillar bar ───────────────────────────────────────────────────────────────

function PillarBar({
  label, score, maxScore, details,
}: {
  label: string; score: number; maxScore: number; details: string[];
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((score / maxScore) * 100);
  const barColor =
    pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{score}/{maxScore}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
        <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
      </div>
      {open && details.length > 0 && (
        <ul className="mt-2.5 space-y-1.5 border-t border-border/40 pt-2.5">
          {details.map((d, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              {d.includes("✓") ? (
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
              )}
              {d}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Keyword gap ──────────────────────────────────────────────────────────────

function KeywordGapSection({
  data, targetTitle, jobDescription,
}: {
  data: import("@/components/onboarding/PrimeResume").PrimeResumeData;
  targetTitle: string;
  jobDescription: string;
}) {
  const gap = useMemo(
    () => analyzeKeywordGap(data, targetTitle, jobDescription),
    [data, targetTitle, jobDescription],
  );

  if (!jobDescription.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        No job description captured — open the posting in your browser and save it with the extension to enable keyword analysis.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/40">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              gap.coveragePercent >= 80 ? "bg-emerald-500" :
              gap.coveragePercent >= 50 ? "bg-amber-500" : "bg-red-500",
            )}
            style={{ width: `${gap.coveragePercent}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold text-foreground">{gap.coveragePercent}%</span>
      </div>

      {gap.topMissing.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Missing from your resume</p>
          <div className="flex flex-wrap gap-1.5">
            {gap.topMissing.map((kw) => (
              <span key={kw} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-300">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {gap.matched.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Matched in your resume</p>
          <div className="flex flex-wrap gap-1.5">
            {gap.matched.slice(0, 12).map(({ keyword }) => (
              <span key={keyword} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                {keyword}
              </span>
            ))}
            {gap.matched.length > 12 && (
              <span className="rounded-lg border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
                +{gap.matched.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bullet quality ───────────────────────────────────────────────────────────

function BulletQualitySection({
  data,
}: {
  data: import("@/components/onboarding/PrimeResume").PrimeResumeData;
}) {
  const quality = useMemo(() => analyzeBulletQuality(data), [data]);
  const [openEntry, setOpenEntry] = useState<string | null>(null);

  if (quality.totalBullets === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No bullets found. Add achievement-oriented bullet points to your experience entries.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Action verbs</p>
          <p className={cn("mt-0.5 text-lg font-bold",
            quality.actionVerbRate >= 80 ? "text-emerald-500" :
            quality.actionVerbRate >= 60 ? "text-amber-500" : "text-red-500",
          )}>
            {quality.actionVerbRate}%
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quantified</p>
          <p className={cn("mt-0.5 text-lg font-bold",
            quality.quantificationRate >= 70 ? "text-emerald-500" :
            quality.quantificationRate >= 40 ? "text-amber-500" : "text-red-500",
          )}>
            {quality.quantificationRate}%
          </p>
        </div>
      </div>

      {quality.entries.map((entry) => {
        const key = `${entry.title}-${entry.company}`;
        const isOpen = openEntry === key;
        const issueCount = entry.bullets.reduce((n, b) => n + b.issues.length, 0);

        return (
          <div key={key} className="rounded-xl border border-border/60 bg-surface/40">
            <button
              type="button"
              onClick={() => setOpenEntry(isOpen ? null : key)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">
                {entry.title}
                {entry.company ? <span className="text-muted-foreground"> · {entry.company}</span> : null}
              </span>
              {issueCount > 0 && (
                <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  {issueCount} issue{issueCount > 1 ? "s" : ""}
                </span>
              )}
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-border/40 px-3 pb-3 pt-2.5 space-y-3">
                {entry.bullets.map((bullet, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xs text-foreground/80 leading-relaxed">{bullet.text}</p>
                    {bullet.issues.length > 0 ? (
                      <ul className="space-y-0.5">
                        {bullet.issues.map((issue, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Strong bullet
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ATS parse view ───────────────────────────────────────────────────────────

function AtsParseView({
  data, targetTitle,
}: {
  data: import("@/components/onboarding/PrimeResume").PrimeResumeData;
  targetTitle: string;
}) {
  const parsed = useMemo(() => simulateAtsParse(data, targetTitle), [data, targetTitle]);

  return (
    <div className="rounded-xl border border-border/60 bg-[oklch(0.13_0.03_268/0.6)] font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[340px]">
      {parsed.warnings.length > 0 && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2">
          {parsed.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-1.5 text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}
      <div className="p-3 space-y-3">
        {parsed.sections.map((section) => (
          <div key={section.id}>
            {section.lines.map((line, i) => (
              <p
                key={i}
                className={cn(
                  "break-words",
                  line.kind === "name" && "font-bold text-white text-sm",
                  line.kind === "contact" && "text-[oklch(0.65_0.05_268)]",
                  line.kind === "section" && "mt-3 font-bold text-[oklch(0.75_0.12_265)] border-b border-[oklch(0.75_0.12_265/0.3)] pb-0.5",
                  line.kind === "entry-title" && "font-semibold text-white/90",
                  line.kind === "entry-sub" && "text-[oklch(0.55_0.05_268)] italic",
                  line.kind === "bullet" && "pl-3 text-white/75",
                  line.kind === "body" && "text-white/75",
                )}
              >
                {line.text}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type Section = "score" | "keywords" | "bullets" | "parse";

function AtsPanelEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Eye className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">ATS analysis not available yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Tailor a resume for this job first — the ATS analysis runs on your tailored resume data.
      </p>
    </div>
  );
}

type AtsPanelBodyProps = {
  entry: JobTrackerDetail;
  preview: NonNullable<JobTrackerDetail["tailoredResumePreview"]>;
  activeSection: Section;
  onSectionChange: (section: Section) => void;
};

function AtsPanelBody({ entry, preview, activeSection, onSectionChange }: AtsPanelBodyProps) {
  const data = preview.preview;
  const targetTitle = preview.targetTitle;
  const jobDescription = entry.description ?? "";

  const readiness = useMemo(
    () => computeResumeReadiness(data, targetTitle, jobDescription),
    [data, targetTitle, jobDescription],
  );

  const navItems: Array<{ id: Section; label: string }> = [
    { id: "score", label: "Score" },
    { id: "keywords", label: "Keywords" },
    { id: "bullets", label: "Bullets" },
    { id: "parse", label: "Robot view" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-5 py-4 space-y-4">
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-border/60 bg-surface/40 p-1 self-start">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeSection === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeSection === "score" && (
        <div className="space-y-4">
          <div className="flex items-center gap-5 rounded-xl border border-border/60 bg-surface/40 px-4 py-4">
            <ScoreRing score={readiness.total} grade={readiness.grade} />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-foreground">Resume Readiness</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {readiness.total >= 90
                  ? "Excellent — this resume is highly optimized."
                  : readiness.total >= 75
                    ? "Good — a few improvements will push it further."
                    : readiness.total >= 60
                      ? "Fair — significant gaps to address before applying."
                      : "Needs work — follow the action items below."}
              </p>
              {!jobDescription.trim() ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Save this job from a posting page to unlock keyword coverage scoring.
                </p>
              ) : null}
            </div>
          </div>

          {readiness.topActions.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">Top actions</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                {readiness.topActions.map((action, i) => (
                  <li key={i} className="text-sm text-foreground/90">{action}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-2">
            {Object.values(readiness.pillars).map((pillar) => (
              <PillarBar
                key={pillar.label}
                label={pillar.label}
                score={pillar.score}
                maxScore={pillar.maxScore}
                details={pillar.details}
              />
            ))}
          </div>
        </div>
      )}

      {activeSection === "keywords" && (
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Keyword Coverage</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              How much of the job description's repeated keywords appear in your resume.
            </p>
          </div>
          <KeywordGapSection data={data} targetTitle={targetTitle} jobDescription={jobDescription} />
        </div>
      )}

      {activeSection === "bullets" && (
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Bullet Quality</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Each bullet is checked for a strong action verb and a measurable result.
            </p>
          </div>
          <BulletQualitySection data={data} />
        </div>
      )}

      {activeSection === "parse" && (
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Robot View</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This is the raw text stream an ATS parser extracts from your resume — top to bottom, no formatting.
            </p>
          </div>
          <AtsParseView data={data} targetTitle={targetTitle} />
        </div>
      )}
    </div>
  );
}

export function AtsPanel({ entry }: AtsPanelProps) {
  const [activeSection, setActiveSection] = useState<Section>("score");
  const preview = entry.tailoredResumePreview;

  if (!preview) {
    return <AtsPanelEmpty />;
  }

  return (
    <AtsPanelBody
      entry={entry}
      preview={preview}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    />
  );
}
