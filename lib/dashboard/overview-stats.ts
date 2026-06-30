import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";

export type OverviewPipelineCounts = {
  captured: number;
  resumePrepared: number;
  autoSuggestReady: number;
  applied: number;
};

export type OverviewWeeklyProgress = {
  captured: number;
  resumesGenerated: number;
  applicationsSent: number;
};

export type OverviewActionQueueItem = JobTrackerSummary & {
  atsScore: number | null;
};

export type OverviewStageBadge = {
  label: string;
  className: string;
};

export type OverviewQueueCta = {
  label: string;
  purpose: "primary" | "secondary";
};

const ACTIONABLE_STATUSES: JobTrackerStatus[] = [
  "CAPTURED",
  "RESUME_READY",
  "READY_TO_APPLY",
];

export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

export function getTimeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatOverviewTimeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "recently";

  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function readAtsScoreFromEnhanceMeta(meta: unknown): number | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const readinessDelta = (meta as { readinessDelta?: unknown }).readinessDelta;
  if (!readinessDelta || typeof readinessDelta !== "object" || Array.isArray(readinessDelta)) {
    return null;
  }
  const after = (readinessDelta as { after?: unknown }).after;
  return typeof after === "number" && Number.isFinite(after) ? Math.round(after) : null;
}

export function countOverviewPipeline(
  statusCounts: Partial<Record<JobTrackerStatus, number>>,
): OverviewPipelineCounts {
  return {
    captured: statusCounts.CAPTURED ?? 0,
    resumePrepared: statusCounts.RESUME_READY ?? 0,
    autoSuggestReady: statusCounts.READY_TO_APPLY ?? 0,
    applied: statusCounts.APPLIED ?? 0,
  };
}

export function countOverviewWaitingJobs(
  statusCounts: Partial<Record<JobTrackerStatus, number>>,
): number {
  return ACTIONABLE_STATUSES.reduce(
    (sum, status) => sum + (statusCounts[status] ?? 0),
    0,
  );
}

export function overviewStageBadge(status: JobTrackerStatus): OverviewStageBadge {
  switch (status) {
    case "RESUME_READY":
      return {
        label: "Resume ready",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      };
    case "READY_TO_APPLY":
      return {
        label: "Auto-suggest",
        className: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
      };
    case "APPLIED":
      return {
        label: "Applied",
        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      };
    default:
      return {
        label: "Captured",
        className: "bg-muted text-muted-foreground",
      };
  }
}

export function overviewQueueCta(status: JobTrackerStatus): OverviewQueueCta {
  if (status === "READY_TO_APPLY") {
    return { label: "Apply now", purpose: "primary" };
  }
  if (status === "RESUME_READY") {
    return { label: "Review resume", purpose: "secondary" };
  }
  return { label: "Prep resume", purpose: "secondary" };
}

export function rankOverviewActionQueue(
  entries: OverviewActionQueueItem[],
  limit = 6,
): OverviewActionQueueItem[] {
  const actionable = entries.filter((entry) => ACTIONABLE_STATUSES.includes(entry.status));

  return [...actionable]
    .sort((a, b) => {
      const scoreA = a.atsScore ?? -1;
      const scoreB = b.atsScore ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    })
    .slice(0, limit);
}

export function weeklyProgressBarPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}
