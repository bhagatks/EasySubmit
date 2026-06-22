import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, Pencil } from "lucide-react";
import { PrimeResume } from "@/components/onboarding/PrimeResume";
import { Button } from "@/components/ui/button";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import { STUDIO_EDITOR_SECTION_LABELS } from "@/lib/resume/studio-editor-sections";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import { cn } from "@/lib/utils";

function readPipelineError(metadata: Record<string, unknown> | null): string | null {
  const err = metadata?.pipelineError;
  return typeof err === "string" && err.trim() ? err.trim() : null;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PanelPlaceholder({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-surface/40 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ReviewResumePanel({ entry }: { entry: JobTrackerDetail }) {
  const preview = entry.tailoredResumePreview;
  const pipelineError = readPipelineError(entry.metadata);
  const ready =
    entry.status === "RESUME_READY" ||
    entry.status === "READY_TO_APPLY" ||
    entry.status === "APPLIED";

  if (!preview || !entry.hasTailoredResume || !ready) {
    return (
      <PanelPlaceholder
        title="Resume not ready yet"
        description={
          pipelineError
            ? pipelineError
            : entry.sourceProfileName
              ? `Tailoring has not completed for this role. Base profile: “${entry.sourceProfileName}”. Re-open the posting and run Apply with EasySubmit, or tailor from the extension card.`
              : "When tailoring runs for this role, your merged resume preview will appear here."
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {entry.sourceProfileId ? (
              <Button variant="outline" className="rounded-xl" asChild>
                <Link href={`/dashboard/resume-profiles/${entry.sourceProfileId}/edit`}>
                  View base profile
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="rounded-xl" asChild>
                <Link href="/dashboard/resume-profiles">Resume profiles</Link>
              </Button>
            )}
            <Button variant="mint" className="rounded-xl" asChild>
              <Link href={entry.canonicalUrl} target="_blank" rel="noopener noreferrer">
                Open job posting
              </Link>
            </Button>
          </div>
        }
      />
    );
  }

  const changedLabels = preview.changedSections
    .filter((id): id is StudioEditorSectionId => id in STUDIO_EDITOR_SECTION_LABELS)
    .map((id) => STUDIO_EDITOR_SECTION_LABELS[id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{preview.targetTitle}</p>
            <p className="text-xs text-muted-foreground">
              Merged from{" "}
              {entry.sourceProfileId ? (
                <Link
                  href={`/dashboard/resume-profiles/${entry.sourceProfileId}/edit`}
                  className="font-medium text-primary hover:underline"
                >
                  {entry.sourceProfileName ?? "base profile"}
                </Link>
              ) : (
                "your base profile"
              )}
              {preview.updatedAt ? (
                <> · Updated {formatDateTime(preview.updatedAt)}</>
              ) : null}
            </p>
          </div>
          <Button variant="mint" size="sm" className="shrink-0 rounded-xl" asChild>
            <Link href={`/dashboard/job-tracker/${entry.id}/resume`}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit in Studio
            </Link>
          </Button>
        </div>

        {changedLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tailored sections:
            </span>
            {changedLabels.map((label) => (
              <span
                key={label}
                className={cn(
                  "rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5",
                  "text-[11px] font-medium text-foreground",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No section overrides recorded — preview matches your base profile for this target role.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/70 bg-background/90 p-4 shadow-inner">
        <PrimeResume
          resume={preview.preview}
          showTargetRole
          variant="default"
          className="mx-auto w-full max-w-[640px]"
        />
      </div>
    </div>
  );
}
