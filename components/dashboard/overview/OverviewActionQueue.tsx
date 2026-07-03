"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { ExtensionInstallCta } from "@/components/dashboard/ExtensionInstallCta";
import { PurposeButton } from "@/components/ui/purpose-button";
import type { OverviewActionQueueItem } from "@/lib/dashboard/overview-stats";
import {
  formatOverviewTimeAgo,
  overviewQueueCta,
  overviewStageBadge,
} from "@/lib/dashboard/overview-stats";
import {
  defaultReviewScreenPanel,
  jobTrackerReviewScreenUrl,
} from "@/lib/job-tracker/review-screen-ui";
import { cn } from "@/lib/utils";

type OverviewActionQueueProps = {
  items: OverviewActionQueueItem[];
  waitingCount: number;
};

export function OverviewActionQueue({ items, waitingCount }: OverviewActionQueueProps) {
  return (
    <section aria-label="Action queue">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Pick up where you left off</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked by ATS match and recency
          </p>
        </div>
        {waitingCount > 0 ? (
          <Link
            href="/dashboard/job-tracker"
            className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            See all {waitingCount} →
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No jobs in your queue yet</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Browse a job board with the extension — we&apos;ll capture the role and prep a tailored
            resume automatically.
          </p>
          <ExtensionInstallCta variant="overview-link" className="mt-4" />
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((entry) => {
            const badge = overviewStageBadge(entry.status);
            const cta = overviewQueueCta(entry.status);
            const reviewHref = jobTrackerReviewScreenUrl(
              entry.id,
              defaultReviewScreenPanel(entry.status),
            );
            const subtitle = [entry.company, formatOverviewTimeAgo(entry.savedAt)]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={entry.id}>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-3 py-3 transition-colors hover:border-border/80 hover:bg-surface/80">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60"
                    aria-hidden="true"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-foreground">
                        {entry.title}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                    {subtitle ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
                    ) : null}
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    {entry.atsScore != null ? (
                      <p
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          entry.atsScore >= 85 ? "text-mint" : "text-muted-foreground",
                        )}
                      >
                        ATS {entry.atsScore}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">ATS —</p>
                    )}
                  </div>

                  <PurposeButton
                    purpose={cta.purpose}
                    size="sm"
                    className="shrink-0 rounded-xl text-xs"
                    asChild
                  >
                    <Link href={reviewHref}>{cta.label}</Link>
                  </PurposeButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
