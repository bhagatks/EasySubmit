import Link from "next/link";
import { JetBrains_Mono } from "next/font/google";
import {
  ArrowUpRight,
  Briefcase,
  ChevronRight,
  FileText,
  Plus,
  Snowflake,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getDashboardStats } from "@/app/actions/dashboard/stats";
import { DashboardWorkspaceShell } from "@/components/dashboard/DashboardWorkspacePage";
import { PipelineBar } from "@/components/dashboard/PipelineBar";
import { Button } from "@/components/ui/button";
import {
  formatDashboardDeltaSpend,
  formatDashboardInteger,
  formatDashboardPercent,
  formatDashboardUsd,
} from "@/lib/dashboard/format-stats";
import { getDisplayName } from "@/lib/dashboard/user-display";
import {
  defaultReviewScreenPanel,
  jobTrackerReviewScreenUrl,
} from "@/lib/job-tracker/review-screen-ui";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SYSTEM_MINT = "oklch(0.82 0.16 165)";
const NAVY_SURFACE = "oklch(0.12 0.03 268)";
const NAVY_CANVAS = "oklch(0.16 0.04 268)";
const MUTED = "oklch(0.45 0.02 268)";
/** ~4 pipeline rows (title, subtitle, progress bar) plus list gaps */
const RECENT_JOB_TRACKER_LIST_MAX_HEIGHT = "24.5rem";

type DashboardOverviewProps = {
  userFirstName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

function monoClassName(): string {
  return jetbrainsMono.className;
}

export async function DashboardOverview({
  userFirstName,
  userName,
  userEmail,
}: DashboardOverviewProps) {
  const firstName = getDisplayName(userFirstName, userEmail, userName);
  const result = await getDashboardStats();
  const mono = monoClassName();

  if (!result.success) {
    return (
      <DashboardWorkspaceShell>
        <div className="rounded-2xl border border-border bg-surface/60 p-8 text-sm text-muted-foreground">
          Could not load dashboard stats. Refresh to try again.
        </div>
      </DashboardWorkspaceShell>
    );
  }

  const { stats } = result;
  const engineHot = Boolean(stats.vaultKeyId);
  const statCards = [
    {
      label: "Resumes generated",
      value: formatDashboardInteger(stats.resumesGenerated),
      delta: stats.targetRole ? `Target · ${stats.targetRole}` : "Career Architecture",
      icon: FileText,
    },
    {
      label: "Jobs tracked",
      value: formatDashboardInteger(stats.jobsTracked),
      delta:
        stats.recentJobTrackerEntries.length > 0
          ? "Saved and applied roles"
          : "Save from the extension",
      icon: Briefcase,
    },
    {
      label: "Avg ATS score",
      value: formatDashboardPercent(stats.avgAtsScore),
      delta:
        stats.avgAtsScore !== null ? "From calibration scores" : "Run engine refinement",
      icon: TrendingUp,
    },
    {
      label: "AI calls (BYOK)",
      value: formatDashboardInteger(stats.aiCallCount),
      delta: formatDashboardDeltaSpend(stats.aiSpendUsd),
      icon: Sparkles,
    },
  ];

  const verificationMetrics = [
    { label: "Parse integrity", value: stats.verification.parseIntegrity },
    { label: "Keyword match", value: stats.verification.keywordMatch },
    { label: "Recruiter readability", value: stats.verification.recruiterReadability },
  ];

  return (
    <DashboardWorkspaceShell className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your job hunt at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="hero">
            <Plus className="h-4 w-4" /> New tailored resume
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={mono + " mt-3 text-3xl font-semibold tabular-nums"}>
              {stat.value}
            </div>
            <div className={mono + " mt-1 text-xs text-mint tabular-nums"}>{stat.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[3fr_2fr]">
        <div
          className="min-h-[22rem] min-w-0 overflow-hidden rounded-2xl border border-white/10 p-6"
          style={{ backgroundColor: NAVY_CANVAS }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent in Job Tracker</h2>
            <Link
              href="/dashboard/job-tracker"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all <ArrowUpRight className="inline h-3 w-3" />
            </Link>
          </div>
          {stats.recentJobTrackerEntries.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">
              No jobs tracked yet. Install the extension and use Save to Job Tracker on a job
              posting to populate this list.
            </p>
          ) : (
            <div
              className="mt-4 -mr-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
              style={{ maxHeight: RECENT_JOB_TRACKER_LIST_MAX_HEIGHT }}
              aria-label="Recent job tracker entries"
            >
              <ul className="space-y-2">
              {stats.recentJobTrackerEntries.map((entry) => {
                const subtitle = [entry.company, entry.location].filter(Boolean).join(" · ");
                const reviewHref = jobTrackerReviewScreenUrl(
                  entry.id,
                  defaultReviewScreenPanel(entry.status),
                );

                return (
                  <li key={entry.id}>
                    <Link
                      href={reviewHref}
                      className="group block cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition-all hover:border-primary/35 hover:bg-white/[0.08] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      title="Open job review"
                    >
                      <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                          <p
                            className="min-w-0 flex-1 truncate text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary"
                            title={entry.title}
                          >
                            {entry.title}
                          </p>
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-primary/0 transition-all group-hover:text-primary/70 group-focus-visible:text-primary/70"
                            aria-hidden="true"
                          />
                        </div>
                        {subtitle ? (
                          <p className="truncate text-xs text-muted-foreground" title={subtitle}>
                            {subtitle}
                          </p>
                        ) : null}
                        <PipelineBar status={entry.status} className="w-full shrink-0" />
                      </div>
                    </Link>
                  </li>
                );
              })}
              </ul>
            </div>
          )}
          {!engineHot ? (
            <div className="mt-8 rounded-xl border border-white/10 p-4 text-center" style={{ backgroundColor: NAVY_SURFACE }}>
              <Snowflake className="mx-auto h-5 w-5" style={{ color: MUTED }} aria-hidden="true" />
              <p className={mono + " mt-2 text-[10px] uppercase tracking-[0.18em]"} style={{ color: MUTED }}>
                Engine cold
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Connect AI Keys to run resume refinement and apply automation.
              </p>
              <Button variant="mint" size="sm" className="mt-3" asChild>
                <Link href="/dashboard/keys">Connect AI Keys</Link>
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-primary/40 bg-surface p-6 shadow-glow">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={
              engineHot
                ? {
                    color: SYSTEM_MINT,
                    borderColor: "oklch(0.82 0.16 165 / 0.4)",
                    backgroundColor: "oklch(0.82 0.16 165 / 0.1)",
                  }
                : undefined
            }
          >
            {engineHot ? "ATS Guarantee · Active" : "ATS Guarantee · Standby"}
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold">Verification</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {engineHot
              ? "Latest Career Architecture metadata from your headless engine."
              : "Ignite the engine to populate parse and keyword integrity scores."}
          </p>
          <div className="mt-5 space-y-3">
            {verificationMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{metric.label}</span>
                  <span className={mono + " text-foreground tabular-nums"}>
                    {metric.value > 0 ? `${metric.value}%` : "—"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-mint"
                    style={{ width: `${Math.max(metric.value, 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {engineHot && stats.aiSpendUsd > 0 ? (
            <p className={mono + " mt-5 text-xs text-muted-foreground tabular-nums"}>
              Lifetime BYOK spend · {formatDashboardUsd(stats.aiSpendUsd)}
            </p>
          ) : null}
        </div>
      </div>
    </DashboardWorkspaceShell>
  );
}
