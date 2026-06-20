import Link from "next/link";
import { JetBrains_Mono } from "next/font/google";
import {
  ArrowUpRight,
  Briefcase,
  FileText,
  Plus,
  Snowflake,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getDashboardStats } from "@/app/actions/dashboard/stats";
import { Button } from "@/components/ui/button";
import {
  formatDashboardDeltaSpend,
  formatDashboardInteger,
  formatDashboardPercent,
  formatDashboardUsd,
} from "@/lib/dashboard/format-stats";
import { getDisplayName } from "@/lib/dashboard/user-display";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SYSTEM_MINT = "oklch(0.82 0.16 165)";
const NAVY_SURFACE = "oklch(0.12 0.03 268)";
const NAVY_CANVAS = "oklch(0.16 0.04 268)";
const MUTED = "oklch(0.45 0.02 268)";

const statusStyle: Record<string, string> = {
  Applied: "bg-primary/15 text-primary",
  Interview: "bg-mint/15 text-mint",
  Draft: "bg-muted text-muted-foreground",
};

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
      <div className="mx-auto max-w-6xl rounded-2xl border border-border bg-surface/60 p-8 text-sm text-muted-foreground">
        Could not load dashboard stats. Refresh to try again.
      </div>
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
      label: "Applications sent",
      value: formatDashboardInteger(stats.applicationsSent),
      delta: stats.recentApplications.length > 0 ? "From architecture ledger" : "No sends yet",
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
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your job hunt at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {engineHot ? (
            <span
              className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{
                color: SYSTEM_MINT,
                borderColor: "oklch(0.82 0.16 165 / 0.4)",
                backgroundColor: "oklch(0.82 0.16 165 / 0.1)",
              }}
            >
              BYOK active
            </span>
          ) : null}
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

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div
          className="min-h-[22rem] rounded-2xl border border-white/10 p-6"
          style={{ backgroundColor: NAVY_CANVAS }}
        >
          {!engineHot ? (
            <div className="flex h-full min-h-[18rem] flex-col items-center justify-center text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10"
                style={{ backgroundColor: NAVY_SURFACE }}
              >
                <Snowflake className="h-7 w-7" style={{ color: MUTED }} aria-hidden="true" />
              </div>
              <p className={mono + " text-[11px] uppercase tracking-[0.2em]"} style={{ color: MUTED }}>
                Engine Cold
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold text-foreground">
                Vault your BYOK key to ignite the engine
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                The headless engine needs a vaulted provider key before refinement and apply
                automation can run.
              </p>
              <Button variant="mint" className="mt-6" asChild>
                <Link href="/dashboard/keys">Connect AI Keys</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Recent applications</h2>
                <Link
                  href="/dashboard/applications"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  View all <ArrowUpRight className="inline h-3 w-3" />
                </Link>
              </div>
              {stats.recentApplications.length === 0 ? (
                <p className="mt-8 text-sm text-muted-foreground">
                  No applications in your Career Architecture yet. Send your first apply from the
                  extension to populate this canvas.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-border/60">
                  {stats.recentApplications.map((application) => (
                    <div
                      key={`${application.role}-${application.company}`}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <div className="text-sm font-medium">{application.role}</div>
                        <div className="text-xs text-muted-foreground">
                          {application.company}
                          {application.when ? ` · ${application.when}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {application.score !== undefined ? (
                          <span className={mono + " text-xs text-muted-foreground tabular-nums"}>
                            ATS {application.score}
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[application.status] ?? statusStyle.Applied}`}
                        >
                          {application.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
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
    </div>
  );
}
