import Link from "next/link";
import { JetBrains_Mono } from "next/font/google";
import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  KeyRound,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { getDashboardStats } from "@/app/actions/dashboard/stats";
import { DashboardWorkspaceShell } from "@/components/dashboard/DashboardWorkspacePage";
import { PipelineBar } from "@/components/dashboard/PipelineBar";
import { Button } from "@/components/ui/button";
import {
  formatDashboardInteger,
  formatDashboardPercent,
  formatDashboardUsd,
} from "@/lib/dashboard/format-stats";
import { getDisplayName } from "@/lib/dashboard/user-display";
import {
  defaultReviewScreenPanel,
  jobTrackerReviewScreenUrl,
} from "@/lib/job-tracker/review-screen-ui";
import type { NextBestAction, SystemQuotaStats } from "@/app/actions/dashboard/stats";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SYSTEM_MINT = "oklch(0.82 0.16 165)";
const NAVY_CANVAS = "oklch(0.16 0.04 268)";
const RECENT_JOB_TRACKER_LIST_MAX_HEIGHT = "24.5rem";

type DashboardOverviewProps = {
  userFirstName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

function monoClass(): string {
  return jetbrainsMono.className;
}

function SystemQuotaCard({ quota }: { quota: SystemQuotaStats }) {
  const mono = monoClass();
  const pct = Math.min((quota.callsToday / quota.dailyCap) * 100, 100);
  const nearLimit = pct >= 75;
  const exhausted = quota.slotsExhausted === quota.slotsTotal;

  if (!nearLimit && !exhausted) return null;

  const barColor = exhausted
    ? "oklch(0.55 0.22 25)"
    : pct >= 90
      ? "oklch(0.68 0.18 45)"
      : SYSTEM_MINT;

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          System AI Quota
        </span>
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={mono + " mt-3 text-3xl font-semibold tabular-nums"}>
        {formatDashboardInteger(quota.callsToday)}
        <span className="ml-1 text-base font-normal text-muted-foreground">
          / {formatDashboardInteger(quota.dailyCap)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <p className={mono + " mt-1.5 text-xs tabular-nums"} style={{ color: barColor }}>
        {exhausted
          ? `All ${quota.slotsTotal} keys exhausted · resets at midnight PT`
          : quota.slotsExhausted > 0
            ? `${quota.slotsExhausted} of ${quota.slotsTotal} keys exhausted`
            : `${Math.round(100 - pct)}% remaining today`}
      </p>
    </div>
  );
}

function OwnKeyCard({
  vaultKeyId,
  activeProvider,
  aiCallCount,
  aiSpendUsd,
}: {
  vaultKeyId: string | null;
  activeProvider: string | null;
  aiCallCount: number;
  aiSpendUsd: number;
}) {
  const mono = monoClass();

  if (!vaultKeyId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Your AI Key
          </span>
          <KeyRound className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          No key connected. Add your own key for unlimited AI — bypasses the system quota entirely.
        </p>
        <Button variant="mint" size="sm" className="mt-3 rounded-xl" asChild>
          <Link href="/dashboard/keys">Connect key</Link>
        </Button>
      </div>
    );
  }

  const providerLabel = activeProvider
    ? activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)
    : "Connected";

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Your AI Key
        </span>
        <KeyRound className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={mono + " mt-3 text-3xl font-semibold tabular-nums"}>
        {formatDashboardInteger(aiCallCount)}
      </div>
      <div className={mono + " mt-1 text-xs tabular-nums"} style={{ color: SYSTEM_MINT }}>
        {providerLabel} · unlimited · {formatDashboardUsd(aiSpendUsd)} spend
      </div>
    </div>
  );
}

function NextActionCard({ action }: { action: NextBestAction }) {
  const mono = monoClass();

  if (action.type === "save_first_job") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Next Action
          </span>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Save your first job from the extension to start tracking and tailoring.
        </p>
        <Button variant="outline" size="sm" className="mt-3 rounded-xl" asChild>
          <Link href="/extension">Get extension</Link>
        </Button>
      </div>
    );
  }

  if (action.type === "ready_to_apply") {
    return (
      <div className="rounded-2xl border border-primary/30 bg-surface/60 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Next Action
          </span>
          <Send className="h-4 w-4 text-primary" />
        </div>
        <div className={mono + " mt-3 text-3xl font-semibold tabular-nums text-primary"}>
          {action.count}
        </div>
        <div className={mono + " mt-1 text-xs tabular-nums"} style={{ color: SYSTEM_MINT }}>
          {action.count === 1 ? "job ready to apply" : "jobs ready to apply"}
        </div>
        <Button variant="mint" size="sm" className="mt-3 rounded-xl" asChild>
          <Link href="/dashboard/job-tracker">Apply now</Link>
        </Button>
      </div>
    );
  }

  if (action.type === "add_key") {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Next Action
          </span>
          <KeyRound className="h-4 w-4 text-amber-500" />
        </div>
        <p className="mt-3 text-sm text-foreground font-medium">
          Add your AI key
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {action.count === 1 ? "1 job is" : `${action.count} jobs are`} waiting for tailoring. Connect a key to run the engine.
        </p>
        <Button variant="outline" size="sm" className="mt-3 rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400" asChild>
          <Link href="/dashboard/keys">Connect key</Link>
        </Button>
      </div>
    );
  }

  if (action.type === "tailoring") {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Next Action
          </span>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
        <div className={mono + " mt-3 text-3xl font-semibold tabular-nums"}>
          {action.count}
        </div>
        <div className={mono + " mt-1 text-xs tabular-nums"} style={{ color: SYSTEM_MINT }}>
          {action.count === 1 ? "job tailoring in progress" : "jobs tailoring in progress"}
        </div>
      </div>
    );
  }

  // all_good
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Next Action
        </span>
        <CheckCircle2 className="h-4 w-4 text-mint" />
      </div>
      <div className={mono + " mt-3 text-3xl font-semibold tabular-nums"}>
        {formatDashboardInteger(action.appliedCount)}
      </div>
      <div className={mono + " mt-1 text-xs tabular-nums"} style={{ color: SYSTEM_MINT }}>
        {action.appliedCount === 1 ? "application sent" : "applications sent"} · queue clear
      </div>
    </div>
  );
}

export async function DashboardOverview({
  userFirstName,
  userName,
  userEmail,
}: DashboardOverviewProps) {
  const firstName = getDisplayName(userFirstName, userEmail, userName);
  const result = await getDashboardStats();
  const mono = monoClass();

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

  const verificationMetrics = [
    { label: "Parse integrity", value: stats.verification.parseIntegrity },
    { label: "Keyword match", value: stats.verification.keywordMatch },
    { label: "Recruiter readability", value: stats.verification.recruiterReadability },
  ];

  const showSystemQuota =
    stats.systemQuota !== null &&
    (stats.systemQuota.slotsExhausted > 0 ||
      stats.systemQuota.callsToday / stats.systemQuota.dailyCap >= 0.75);

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
        <div className="rounded-2xl border border-border bg-surface/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Activity
            </span>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-3 flex items-end gap-4">
            <div>
              <div className={mono + " text-3xl font-semibold tabular-nums"}>
                {formatDashboardInteger(stats.resumesGenerated)}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">resumes</div>
            </div>
            <div className="mb-0.5 text-muted-foreground/40 text-lg font-light">/</div>
            <div>
              <div className={mono + " text-3xl font-semibold tabular-nums"}>
                {formatDashboardInteger(stats.jobsTracked)}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">jobs tracked</div>
            </div>
          </div>
          <div className={mono + " mt-2 text-xs tabular-nums"} style={{ color: SYSTEM_MINT }}>
            {stats.targetRole ? `Target · ${stats.targetRole}` : "Career Architecture"}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Avg ATS score
            </span>
          </div>
          <div className={mono + " mt-3 text-3xl font-semibold tabular-nums"}>
            {formatDashboardPercent(stats.avgAtsScore)}
          </div>
          <div className={mono + " mt-1 text-xs tabular-nums"} style={{ color: SYSTEM_MINT }}>
            {stats.avgAtsScore !== null
              ? stats.avgAtsScore >= 80
                ? "Strong · ready to apply"
                : stats.avgAtsScore >= 60
                  ? "Good · keep refining"
                  : "Needs work · run engine"
              : "Run engine refinement"}
          </div>
        </div>

        <OwnKeyCard
          vaultKeyId={stats.vaultKeyId}
          activeProvider={stats.activeProvider}
          aiCallCount={stats.aiCallCount}
          aiSpendUsd={stats.aiSpendUsd}
        />

        {showSystemQuota && stats.systemQuota ? (
          <SystemQuotaCard quota={stats.systemQuota} />
        ) : (
          <NextActionCard action={stats.nextBestAction} />
        )}
      </div>

      {showSystemQuota && stats.systemQuota ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-start-4">
            <NextActionCard action={stats.nextBestAction} />
          </div>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[3fr_2fr]">
        <div
          className="min-h-[22rem] min-w-0 overflow-hidden rounded-2xl border border-white/10 p-6"
          style={{ backgroundColor: NAVY_CANVAS }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Job Tracker</h2>
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
              aria-label="Job tracker entries"
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
