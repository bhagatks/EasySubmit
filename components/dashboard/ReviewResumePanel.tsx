"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { ArrowUp, Bot, TrendingUp } from "lucide-react";
import {
  enhanceJobResumeFromReview,
  exportReviewDocument,
  loadReviewLatexWorkspace,
  type EnhanceResumeActionResult,
} from "@/app/actions/review-documents";
import { DocumentToolbar, type DocumentToolbarAction } from "@/components/dashboard/review/DocumentToolbar";
import { ReviewPreviewZoomControls } from "@/components/dashboard/review/ReviewPreviewZoomControls";
import { ReviewResumePreview } from "@/components/dashboard/review/ReviewResumePreview";
import { LatexFullscreenEditor } from "@/components/dashboard/review/LatexFullscreenEditor";
import { Button } from "@/components/ui/button";
import { base64ToUint8Array, downloadBytes } from "@/lib/job-tracker/export/download-client";
import {
  canExportReviewDocument,
  canOpenLatexEditor,
} from "@/lib/job-tracker/review-readiness";
import { jobTrackerReviewStudioUrl } from "@/lib/job-tracker/review-screen-ui";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import { DEFAULT_STUDIO_ZOOM } from "@/lib/resume/studio-preview-zoom";

type ReviewResumePanelProps = {
  entry: JobTrackerDetail;
  onRefresh: () => void;
};

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
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

type EnhanceFeedback = {
  fallbackUsed: boolean;
  atsDelta: { before: number; after: number } | null;
  summary: string | null;
};

function EnhanceFeedbackCard({ feedback }: { feedback: EnhanceFeedback }) {
  const delta = feedback.atsDelta;
  const improved = delta && delta.after > delta.before;

  return (
    <div
      className={
        feedback.fallbackUsed
          ? "absolute left-2 right-2 top-11 z-10 rounded-xl border border-amber-500/30 bg-[oklch(0.16_0.04_268/0.95)] px-3 py-2.5 text-xs shadow-lg"
          : "absolute left-2 right-2 top-11 z-10 rounded-xl border border-mint/30 bg-[oklch(0.16_0.04_268/0.95)] px-3 py-2.5 text-xs shadow-lg"
      }
    >
      <div className="flex items-start gap-2">
        {feedback.fallbackUsed ? (
          <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
        ) : (
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          {feedback.fallbackUsed ? (
            <p className="font-medium text-amber-300">Enhanced without AI (rules engine)</p>
          ) : (
            <p className="font-medium text-mint">Resume enhanced</p>
          )}

          {delta ? (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-muted-foreground">ATS score</span>
              <span className="font-mono font-semibold text-foreground">{delta.before}</span>
              <ArrowUp
                className={improved ? "h-3 w-3 text-mint" : "h-3 w-3 rotate-180 text-red-400"}
                aria-hidden="true"
              />
              <span
                className={
                  improved
                    ? "font-mono font-semibold text-mint"
                    : "font-mono font-semibold text-red-400"
                }
              >
                {delta.after}
              </span>
              {improved ? (
                <span className="text-mint">(+{delta.after - delta.before} pts)</span>
              ) : null}
            </div>
          ) : null}

          {feedback.summary ? (
            <p className="mt-1 text-muted-foreground">{feedback.summary}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ReviewResumePanel({ entry, onRefresh }: ReviewResumePanelProps) {
  const preview = entry.tailoredResumePreview;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhanceFeedback, setEnhanceFeedback] = useState<EnhanceFeedback | null>(null);
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexPayload, setLatexPayload] = useState<{
    latex: string;
    previewHtml: string;
  } | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_STUDIO_ZOOM);

  const runExport = useCallback(
    async (format: "pdf" | "word") => {
      setBusy(format);
      setError(null);
      const result = await exportReviewDocument({ jobId: entry.id, kind: "resume", format });
      setBusy(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      downloadBytes({
        bytes: base64ToUint8Array(result.base64),
        filename: result.filename,
        mimeType: result.mimeType,
      });
    },
    [entry.id],
  );

  const openLatex = useCallback(async () => {
    setBusy("latex");
    setError(null);
    const result = await loadReviewLatexWorkspace({ jobId: entry.id, kind: "resume" });
    setBusy(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setLatexPayload({ latex: result.latex, previewHtml: result.previewHtml });
    setLatexOpen(true);
  }, [entry.id]);

  if (!preview?.previewHtml) {
    return (
      <PanelPlaceholder
        title="Resume not ready yet"
        description={
          entry.previewError ??
          (entry.sourceProfileName
            ? `Tailoring has not completed for this role. Base profile: “${entry.sourceProfileName}”.`
            : entry.sourceProfileId
              ? "Link a resume profile to this job to see a preview here."
              : "When tailoring runs for this role, your merged resume preview will appear here.")
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {entry.sourceProfileId ? (
              <Button variant="outline" className="rounded-xl" asChild>
                <Link href={`/dashboard/resume-profiles/${entry.sourceProfileId}/edit`}>
                  View base profile
                </Link>
              </Button>
            ) : null}
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

  const canExport = canExportReviewDocument({
    kind: "resume",
    hasTailoredResume: entry.hasTailoredResume,
    status: entry.status,
    resumeHasContent: Boolean(preview.targetTitle?.trim() || preview.preview.summary?.trim()),
    coverLetter: null,
  });

  const actions: DocumentToolbarAction[] = [
    {
      id: "studio",
      label: "Studio Edit",
      icon: "studio",
      variant: "mintOutline",
      href: entry.hasTailoredResume ? jobTrackerReviewStudioUrl(entry.id) : undefined,
      disabled: !entry.hasTailoredResume,
      title: entry.hasTailoredResume
        ? "Open full-screen resume Studio"
        : "Tailor a resume for this job first",
    },
    {
      id: "enhance",
      label: "Enhance with AI",
      icon: "enhance",
      variant: "outline",
      disabled: !entry.hasTailoredResume,
      busy: busy === "enhance",
      title: entry.hasTailoredResume ? undefined : "Tailor a resume for this job first",
      onClick: () => {
        void (async () => {
          setBusy("enhance");
          setError(null);
          setEnhanceFeedback(null);
          const result: EnhanceResumeActionResult = await enhanceJobResumeFromReview(entry.id);
          setBusy(null);
          if (!result.success) {
            setError(result.error);
            return;
          }
          setEnhanceFeedback({
            fallbackUsed: result.fallbackUsed ?? false,
            atsDelta: result.atsDelta ?? null,
            summary: result.enhanceSummary ?? result.fallbackSummary ?? null,
          });
          onRefresh();
        })();
      },
    },
    {
      id: "word",
      label: "Word",
      icon: "word",
      variant: "outline",
      disabled: !canExport,
      busy: busy === "word",
      onClick: () => void runExport("word"),
    },
    {
      id: "pdf",
      label: "PDF",
      icon: "pdf",
      variant: "mint",
      disabled: !canExport,
      busy: busy === "pdf",
      onClick: () => void runExport("pdf"),
    },
    {
      id: "latex",
      label: "LaTeX",
      icon: "latex",
      variant: "outline",
      disabled: !canOpenLatexEditor({
        kind: "resume",
        hasTailoredResume: entry.hasTailoredResume,
        status: entry.status,
      }),
      busy: busy === "latex",
      onClick: () => void openLatex(),
    },
  ];

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 bg-white">
        <div className="pointer-events-none absolute inset-x-2 top-1.5 z-10 flex items-start justify-between gap-2">
          <DocumentToolbar
            actions={actions}
            appearance="overlay"
            className="pointer-events-auto min-w-0 flex-1"
          />
          <ReviewPreviewZoomControls
            zoom={zoom}
            onChange={setZoom}
            className="pointer-events-auto"
          />
        </div>

        {error ? (
          <p className="absolute left-2 right-2 top-11 z-10 rounded-lg border border-red-500/30 bg-[oklch(0.16_0.04_268/0.92)] px-3 py-1.5 text-xs text-red-300">
            {error}
          </p>
        ) : enhanceFeedback ? (
          <EnhanceFeedbackCard feedback={enhanceFeedback} />
        ) : null}

        <ReviewResumePreview
          previewHtml={preview.previewHtml}
          zoom={zoom}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {latexOpen && latexPayload ? (
        <LatexFullscreenEditor
          open={latexOpen}
          onClose={() => setLatexOpen(false)}
          jobId={entry.id}
          kind="resume"
          title={`Resume · ${entry.company ?? "Job"}`}
          initialLatex={latexPayload.latex}
          initialPreviewHtml={latexPayload.previewHtml}
          onSaved={onRefresh}
        />
      ) : null}
    </div>
  );
}
