import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  Inbox,
  Sparkles,
} from "lucide-react";
import type { OverviewPipelineCounts } from "@/lib/dashboard/overview-stats";
import { cn } from "@/lib/utils";

type OverviewPipelineStripProps = {
  pipeline: OverviewPipelineCounts;
  capturedThisWeek: number;
  appliedThisWeek: number;
};

type PipelineCardConfig = {
  key: keyof OverviewPipelineCounts;
  title: string;
  subtitle: string;
  icon: typeof Inbox;
  active: boolean;
};

export function OverviewPipelineStrip({
  pipeline,
  capturedThisWeek,
  appliedThisWeek,
}: OverviewPipelineStripProps) {
  const cards: PipelineCardConfig[] = [
    {
      key: "captured",
      title: "Captured",
      subtitle: `${capturedThisWeek} new this week`,
      icon: Inbox,
      active: false,
    },
    {
      key: "resumePrepared",
      title: "Resume Prepared",
      subtitle: "awaiting your review",
      icon: FileText,
      active: pipeline.resumePrepared > 0,
    },
    {
      key: "autoSuggestReady",
      title: "Auto-Suggest Ready",
      subtitle: "1-click to apply",
      icon: Sparkles,
      active: pipeline.autoSuggestReady > 0,
    },
    {
      key: "applied",
      title: "Applied",
      subtitle: `${appliedThisWeek} this week`,
      icon: CheckCircle2,
      active: false,
    },
  ];

  return (
    <section aria-label="Pipeline">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Pipeline</h2>
        <Link
          href="/dashboard/job-tracker"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all →
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-stretch">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const count = pipeline[card.key];

          return (
            <div key={card.key} className="contents">
              <Link
                href="/dashboard/job-tracker"
                className={cn(
                  "group flex min-w-0 flex-col rounded-xl border bg-surface/60 p-4 transition-all",
                  card.active
                    ? "border-primary/50 ring-1 ring-primary/25 hover:border-primary/70 hover:bg-surface/80"
                    : "border-border hover:border-border/80 hover:bg-surface/80",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    card.active ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <p className="mt-3 font-display text-2xl font-semibold tabular-nums leading-none">
                  {count}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{card.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
              </Link>
              {index < cards.length - 1 ? (
                <div className="hidden items-center justify-center px-1 sm:flex" aria-hidden="true">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
