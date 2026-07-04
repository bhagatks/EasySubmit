"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Eye, ShieldCheck, ShieldAlert } from "lucide-react";
import { simulateAtsParse } from "@/lib/job-tracker/ats/ats-parse-simulator";
import { analyzeBulletQuality } from "@/lib/job-tracker/ats/bullet-quality";
import { analyzeKeywordGap } from "@/lib/job-tracker/ats/keyword-gap";
import { resolveKeywordGap } from "@/lib/job-tracker/ats/resolve-keyword-gap";
import { computeSemanticSimilarity } from "@/lib/job-tracker/ats/semantic-similarity";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { detectPlatform, getPlatformRules } from "@/lib/job-tracker/ats/platform-rules";
import { computePlatformScores, type PlatformScoreResult } from "@/lib/job-tracker/ats/platform-score";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import { trackAtsScoreViewed } from "@/src/shared/analytics";
import { cn } from "@/lib/utils";

type AtsPanelProps = {
  entry: JobTrackerDetail;
  /** "modal" = fixed-height scrollable (Review Screen). "inline" = natural page flow. */
  variant?: "modal" | "inline";
};

const STRATEGY_LABELS: Record<string, string> = {
  keyword_search: "Keyword search",
  ai_match: "AI match",
  parse_first: "Parse first",
  human_review: "Human review",
};

const STRATEGY_EXPLANATIONS: Record<string, string> = {
  keyword_search: "Uses boolean/keyword search. Exact keyword matching and repetition matter most.",
  ai_match: "Algorithmically ranks candidates. Skills taxonomy breadth and requirement matching matter.",
  parse_first: "Extracts structured fields first. Parser fidelity, standard titles, and dates matter most.",
  human_review: "No algorithmic scoring. Recruiters read your resume directly. Readability matters most.",
};

function PlatformStrategyBanner({ platform }: { platform: ReturnType<typeof getPlatformRules> }) {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <p className="font-display text-sm font-semibold text-foreground">{platform.label}</p>
        <span
          className="rounded-full bg-surface/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground cursor-help relative"
          title={STRATEGY_EXPLANATIONS[platform.strategy] ?? platform.strategy}
        >
          {STRATEGY_LABELS[platform.strategy] ?? platform.strategy}
        </span>
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showExplanation ? "Hide" : "Why?"}
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{platform.tip}</p>
      {showExplanation && (
        <div className="mt-3 pt-3 border-t border-primary/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold">How it works:</span> {STRATEGY_EXPLANATIONS[platform.strategy]}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = "lg" }: { score: number; size?: "lg" | "sm" }) {
  const r = size === "lg" ? 36 : 26;
  const viewBox = size === "lg" ? "0 0 96 96" : "0 0 68 68";
  const cx = size === "lg" ? 48 : 34;
  const strokeW = size === "lg" ? 7 : 5;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const color =
    score >= 80 ? "#34d399" : score >= 65 ? "#60a5fa" : score >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        size === "lg" ? "h-24 w-24" : "h-[68px] w-[68px]",
      )}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox={viewBox} aria-hidden="true">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} className="text-border/40" />
        <circle
          cx={cx} cy={cx} r={r} fill="none" strokeWidth={strokeW}
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="text-center">
        <p
          className={cn(
            "font-display font-bold leading-none text-foreground",
            size === "lg" ? "text-2xl" : "text-lg",
          )}
        >
          {score}
        </p>
      </div>
    </div>
  );
}

// ─── Platform card ─────────────────────────────────────────────────────────────

function PlatformCard({ result }: { result: PlatformScoreResult }) {
  const color =
    result.score >= 80 ? "#34d399" : result.score >= 65 ? "#60a5fa" : result.score >= 50 ? "#fbbf24" : "#f87171";

  const barColor = (v: number) =>
    v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-blue-400" : v >= 40 ? "bg-amber-400" : "bg-red-500";

  const breakdown = [
    { label: "Formatting", value: result.breakdown.formatting },
    { label: "Keywords", value: result.breakdown.keywords },
    { label: "Sections", value: result.breakdown.sections },
    { label: "Experience", value: result.breakdown.experience },
    { label: "Education", value: result.breakdown.education },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-surface/40 p-3 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center gap-2.5">
        <ScoreRing score={result.score} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{result.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{result.vendor}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {result.passes ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                <ShieldCheck className="h-2.5 w-2.5" /> PASSES
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                <ShieldAlert className="h-2.5 w-2.5" /> AT RISK
              </span>
            )}
            <span className="text-[10px] font-semibold" style={{ color }}>{result.grade}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border/40 pt-2">
        {breakdown.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-[70px] shrink-0 text-[10px] text-muted-foreground">{label}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/40">
              <div className={cn("h-full rounded-full transition-all duration-500", barColor(value))} style={{ width: `${value}%` }} />
            </div>
            <span className="w-6 shrink-0 text-right text-[10px] font-medium text-foreground/70">{value}</span>
          </div>
        ))}
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
  gap, jobDescription,
}: {
  gap: ReturnType<typeof analyzeKeywordGap>;
  jobDescription: string;
}) {
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

      {gap.injectable.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Easy wins — add these labels to your resume
          </p>
          <p className="mb-1.5 text-[11px] text-muted-foreground">
            You likely already have these skills under a different name. Just add the JD's exact phrasing.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gap.injectable.map((kw) => (
              <span key={kw} className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {gap.nonInjectable.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Truly missing — not in your resume</p>
          <div className="flex flex-wrap gap-1.5">
            {gap.nonInjectable.slice(0, 8).map((kw) => (
              <span key={kw} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-300">
                {kw}
              </span>
            ))}
            {gap.nonInjectable.length > 8 && (
              <span className="rounded-lg border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
                +{gap.nonInjectable.length - 8} more
              </span>
            )}
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

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: "critical" | "high" | "medium" | "low" }) {
  const styles = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    low: "bg-border/40 text-muted-foreground border-border/60",
  };
  return (
    <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", styles[severity])}>
      {severity}
    </span>
  );
}

// ─── Resume overview ──────────────────────────────────────────────────────────

function ResumeOverviewCard({
  data, targetTitle,
}: {
  data: import("@/components/onboarding/PrimeResume").PrimeResumeData;
  targetTitle: string;
}) {
  const overview = useMemo(() => {
    const parsed = simulateAtsParse(data, targetTitle);
    const wordCount = Math.round(parsed.totalChars / 5);
    const pages = Math.max(1, Math.ceil(wordCount / 450));
    const detectedSections = parsed.sections.map((s) => s.title).filter((t) => t !== "Header");
    return {
      wordCount,
      pages,
      sectionCount: parsed.sections.length,
      detectedSections,
      skillCount: (data.skills ?? []).filter(Boolean).length,
      positionCount: (data.experience ?? []).filter((e) => e.title?.trim()).length,
      educationCount: (data.education ?? []).filter((e) => e.school?.trim()).length,
      hasName: Boolean(data.fullName?.trim()),
      hasEmail: Boolean(data.email?.trim()),
      hasPhone: Boolean(data.phone?.trim()),
      hasLinkedIn: Boolean(data.linkedIn?.trim()),
      topSkills: (data.skills ?? []).filter(Boolean).slice(0, 8),
    };
  }, [data, targetTitle]);

  const contactItems = [
    { label: "Name", ok: overview.hasName },
    { label: "Email", ok: overview.hasEmail },
    { label: "Phone", ok: overview.hasPhone },
    { label: "LinkedIn", ok: overview.hasLinkedIn },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-surface/40 p-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resume Overview</p>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { value: overview.wordCount, label: "words" },
          { value: overview.pages, label: overview.pages === 1 ? "page" : "pages" },
          { value: overview.sectionCount, label: "sections" },
        ].map(({ value, label }) => (
          <div key={label} className="rounded-lg border border-border/40 bg-surface/60 py-2">
            <p className="font-display text-lg font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { value: overview.skillCount, label: "skills" },
          { value: overview.positionCount, label: overview.positionCount === 1 ? "position" : "positions" },
          { value: overview.educationCount, label: "education" },
        ].map(({ value, label }) => (
          <div key={label} className="rounded-lg border border-border/40 bg-surface/60 py-2">
            <p className="font-display text-lg font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {overview.detectedSections.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Detected Sections</p>
          <div className="flex flex-wrap gap-1">
            {overview.detectedSections.map((s) => (
              <span key={s} className="rounded-full border border-border/60 bg-surface/60 px-2 py-0.5 text-[10px] text-foreground/80">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {overview.topSkills.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Extracted Skills</p>
          <div className="flex flex-wrap gap-1">
            {overview.topSkills.map((s) => (
              <span key={s} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contact Info</p>
        <div className="flex flex-wrap gap-1.5">
          {contactItems.map(({ label, ok }) => (
            <span
              key={label}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-red-500/30 bg-red-500/10 text-red-400",
              )}
            >
              {ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
              {label}
            </span>
          ))}
        </div>
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
  variant?: "modal" | "inline";
};

function buildExperienceBlob(data: import("@/components/onboarding/PrimeResume").PrimeResumeData): string {
  return (data.experience ?? [])
    .map((e) => `${e.title ?? ""} ${e.company ?? ""} ${(e.bullets ?? []).join(" ")}`)
    .join("\n");
}

function AtsPanelBody({ entry, preview, activeSection, onSectionChange, variant = "modal" }: AtsPanelBodyProps) {
  const data = preview.preview;
  const targetTitle = preview.targetTitle;
  const jobDescription = entry.description ?? "";
  const jdIntelligence = entry.jdIntelligence ?? null;
  const experienceBlob = useMemo(() => buildExperienceBlob(data), [data]);

  const atsPlatform = useMemo(
    () => detectPlatform(entry.canonicalUrl, entry.platform),
    [entry.canonicalUrl, entry.platform],
  );

  const platformRules = useMemo(() => getPlatformRules(atsPlatform), [atsPlatform]);

  const readiness = useMemo(
    () => computeResumeReadiness(data, targetTitle, jobDescription, jdIntelligence, atsPlatform),
    [data, targetTitle, jobDescription, jdIntelligence, atsPlatform],
  );

  const bulletQuality = useMemo(() => analyzeBulletQuality(data), [data]);

  const gap = useMemo(
    () => resolveKeywordGap(data, targetTitle, jobDescription, jdIntelligence, { experienceBlob }),
    [data, targetTitle, jobDescription, jdIntelligence, experienceBlob],
  );

  const platformScores = useMemo(() => {
    const formattingScore = Math.round((readiness.pillars.atsCompliance.score / 25) * 100);
    const sectionsScore = Math.round((readiness.pillars.completeness.score / 25) * 100);
    const experienceScore = Math.round((readiness.pillars.bulletQuality.score / 25) * 100);

    // Three keyword strategies — exact, fuzzy (synonym-aware), semantic (TF cosine)
    const exactKeywordScore = gap.exactCoveragePercent;
    const fuzzyKeywordScore = gap.coveragePercent; // synonym-expanded coverage
    const semanticKeywordScore = jobDescription.trim()
      ? computeSemanticSimilarity(
          [targetTitle, data.summary ?? "", ...(data.skills ?? [])].join(" "),
          jobDescription,
        )
      : 0;

    // Granular education score: degree level matters, not just presence
    const edu = (data.education ?? []).filter((e) => e.school?.trim());
    let educationScore = 0;
    if (edu.length > 0) {
      educationScore = 40; // has education
      const deg = (edu[0]?.degree ?? "").toLowerCase();
      if (deg) {
        educationScore = 60; // has degree field
        if (/ph\.?d|doctorate|doctor of/i.test(deg)) {
          educationScore = 100;
        } else if (/master|m\.?s\.?|m\.?b\.?a|m\.?eng/i.test(deg)) {
          educationScore = 85;
        } else if (/bachelor|b\.?s\.?|b\.?a\.?|b\.?eng|undergrad/i.test(deg)) {
          educationScore = 75;
        } else if (/associate|diploma|certificate/i.test(deg)) {
          educationScore = 65;
        }
      }
    }

    return computePlatformScores({
      formattingScore,
      exactKeywordScore,
      fuzzyKeywordScore,
      semanticKeywordScore,
      sectionsScore,
      experienceScore,
      educationScore,
      quantificationRate: bulletQuality.quantificationRate,
    });
  }, [readiness, bulletQuality, data, gap, jobDescription, targetTitle]);

  const passCount = platformScores.filter((p) => p.passes).length;

  const navItems: Array<{ id: Section; label: string }> = [
    { id: "score", label: "Score" },
    { id: "keywords", label: "Keywords" },
    { id: "bullets", label: "Bullets" },
    { id: "parse", label: "Robot view" },
  ];

  return (
    <div className={cn("flex flex-col px-5 py-4 space-y-4", variant === "modal" && "h-full min-h-0 overflow-y-auto")}>
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
        <div className="space-y-5">

          <PlatformStrategyBanner platform={platformRules} />

          {/* Hero score + platforms passed */}
          <div className="flex items-center gap-5 rounded-xl border border-border/60 bg-surface/40 px-4 py-4">
            <ScoreRing score={readiness.total} size="lg" />
            <div className="min-w-0 flex-1">
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
            </div>
            <div className="shrink-0 text-center">
              <p className="font-display text-2xl font-bold text-foreground">{passCount}/6</p>
              <p className="text-[10px] text-muted-foreground">Systems Passed</p>
              <div className={cn(
                "mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                passCount >= 5 ? "bg-emerald-500/15 text-emerald-500" :
                passCount >= 3 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400",
              )}>
                {passCount >= 5 ? "General Readiness" : passCount >= 3 ? "Partial Readiness" : "Not Ready"}
              </div>
            </div>
          </div>

          {/* Priority focus areas */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority Focus Areas</p>
            <div className="space-y-2">
              {Object.values(readiness.pillars)
                .slice()
                .sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))
                .map((pillar) => (
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

          {/* Per-platform score cards */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Platform Scores</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {platformScores.map((result) => (
                <PlatformCard key={result.id} result={result} />
              ))}
            </div>
          </div>

          {/* Severity-tagged top actions */}
          {readiness.topActions.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Optimization Suggestions</p>
              <div className="space-y-2">
                {readiness.topActions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface/40 px-3 py-2.5"
                  >
                    <AlertTriangle className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      action.severity === "critical" ? "text-red-400" :
                      action.severity === "high" ? "text-amber-400" :
                      action.severity === "medium" ? "text-blue-400" : "text-muted-foreground",
                    )} />
                    <p className="min-w-0 flex-1 text-sm text-foreground/90">{action.message}</p>
                    <SeverityBadge severity={action.severity} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume overview */}
          <ResumeOverviewCard data={data} targetTitle={targetTitle} />

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
          <KeywordGapSection gap={gap} jobDescription={jobDescription} />
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

export function AtsPanel({ entry, variant = "modal" }: AtsPanelProps) {
  const [activeSection, setActiveSection] = useState<Section>("score");
  const preview = entry.tailoredResumePreview;
  const trackedEntryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    if (trackedEntryRef.current === entry.id) return;
    trackedEntryRef.current = entry.id;
    trackAtsScoreViewed({
      entryId: entry.id,
      hasTailoredResume: entry.hasTailoredResume,
      platform: entry.platform,
      surface: variant === "inline" ? "ats_scores" : "review_screen",
    });
  }, [entry.hasTailoredResume, entry.id, entry.platform, preview, variant]);

  if (!preview) {
    return <AtsPanelEmpty />;
  }

  return (
    <AtsPanelBody
      entry={entry}
      preview={preview}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      variant={variant}
    />
  );
}
