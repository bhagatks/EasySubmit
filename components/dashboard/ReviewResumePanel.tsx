"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ArrowUp, Bot, TrendingUp } from "lucide-react";
import {
  enhanceJobResumeFromReview,
  exportReviewDocument,
  loadReviewLatexWorkspace,
  type EnhanceResumeActionResult,
} from "@/app/actions/review-documents";
import { AiOutcomeBanner } from "@/components/dashboard/AiOutcomeBanner";
import { DocumentToolbar, type DocumentToolbarAction } from "@/components/dashboard/review/DocumentToolbar";
import { ReviewPreviewZoomControls } from "@/components/dashboard/review/ReviewPreviewZoomControls";
import { ReviewResumePreview } from "@/components/dashboard/review/ReviewResumePreview";
import { LatexFullscreenEditor } from "@/components/dashboard/review/LatexFullscreenEditor";
import { base64ToUint8Array, downloadBytes } from "@/lib/job-tracker/export/download-client";
import {
  canExportReviewDocument,
  canOpenLatexEditor,
} from "@/lib/job-tracker/review-readiness";
import {
  enhanceFeedbackTierLabel,
  type EnhanceFeedbackTier,
} from "@/lib/job-tracker/enhance/enhance-feedback-tier";
import { jobTrackerReviewStudioUrl, JOB_RESUME_STUDIO_LABEL } from "@/lib/job-tracker/review-screen-ui";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import { DEFAULT_STUDIO_ZOOM } from "@/lib/resume/studio-preview-zoom";
import { EnhanceCoveragePanel } from "@/components/dashboard/review/EnhanceCoveragePanel";
import { trackEnhanceClicked, trackEnhanceCompleted, trackResumeExported } from "@/src/shared/analytics/product-events";

type ReviewResumePanelProps = {
  entry: JobTrackerDetail;
  onRefresh: () => void;
  aiEnabled: boolean;
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
  engineMode: "ai" | "deterministic";
  feedbackTier?: EnhanceFeedbackTier;
  atsDelta: { before: number; after: number } | null;
  summary: string | null;
  warning?: string | null;
  coherenceWarnings?: string[] | null;
  suggestedTargetRoles?: string[] | null;
  coverageAfter?: import("@/lib/job-tracker/enhance/enhance-brief").JdCoverageReport | null;
};

function readPersistedAiWarning(entry: JobTrackerDetail): string | null {
  const fromTracker = entry.metadata?.pipelineAiWarning;
  if (typeof fromTracker === "string" && fromTracker.trim()) {
    return fromTracker.trim();
  }
  const fromSession = entry.enhanceSessionMeta?.warning;
  if (typeof fromSession === "string" && fromSession.trim()) {
    return fromSession.trim();
  }
  return null;
}

function EnhanceFeedbackCard({ feedback }: { feedback: EnhanceFeedback }) {
  const delta = feedback.atsDelta;
  const improved = delta && delta.after > delta.before;
  const tier = feedback.feedbackTier ?? (feedback.engineMode === "deterministic" ? "formatting" : "success");
  const tierLabel = enhanceFeedbackTierLabel(tier);
  const roleMismatch = tier === "role_mismatch";

  return (
    <div
      className={
        roleMismatch || feedback.engineMode === "deterministic"
          ? "absolute left-2 right-2 top-11 z-10 rounded-xl border border-amber-500/30 bg-[oklch(0.16_0.04_268/0.95)] px-3 py-2.5 text-xs shadow-lg"
          : "absolute left-2 right-2 top-11 z-10 rounded-xl border border-mint/30 bg-[oklch(0.16_0.04_268/0.95)] px-3 py-2.5 text-xs shadow-lg"
      }
    >
      <div className="flex items-start gap-2">
        {roleMismatch || feedback.engineMode === "deterministic" ? (
          <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
        ) : (
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className={roleMismatch ? "font-medium text-amber-300" : feedback.engineMode === "deterministic" ? "font-medium text-amber-300" : "font-medium text-mint"}>
            {tier === "formatting" && feedback.engineMode === "deterministic"
              ? "Enhanced without AI (rules engine)"
              : tierLabel}
          </p>
          {tier === "formatting" && feedback.engineMode === "deterministic" ? (
            <p className="mt-0.5 text-muted-foreground">{tierLabel}</p>
          ) : null}

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

          {improved &&
          feedback.coherenceWarnings?.some((w) => w.includes("may not match your experience")) ? (
            <p className="mt-1 text-amber-300/90">
              Keyword match improved, but this role may not align with your experience.
            </p>
          ) : null}

          {feedback.summary ? (
            <p className="mt-1 text-muted-foreground">{feedback.summary}</p>
          ) : null}
          {feedback.warning ? (
            <p className="mt-1 text-amber-300/90">{feedback.warning}</p>
          ) : null}
          {feedback.coherenceWarnings?.map((note) => (
            <p key={note} className="mt-1 text-amber-300/90">
              {note}
            </p>
          ))}
          {feedback.suggestedTargetRoles && feedback.suggestedTargetRoles.length > 0 ? (
            <p className="mt-1 text-amber-300/90">
              Roles that fit your experience better: {feedback.suggestedTargetRoles.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ReviewResumePanel({ entry, onRefresh, aiEnabled }: ReviewResumePanelProps) {
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
    async (format: "pdf" | "word", profileSource: "tailored" | "base" = "tailored") => {
      setBusy(profileSource === "base" ? `base-${format}` : format);
      setError(null);
      const result = await exportReviewDocument({
        jobId: entry.id,
        kind: "resume",
        format,
        profileSource,
      });
      setBusy(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      trackResumeExported({
        surface: "review_resume",
        format,
        entryId: entry.id,
      });
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

  const showBaseProfileExport =
    entry.enhanceSessionMeta?.engineMode === "deterministic" ||
    enhanceFeedback?.engineMode === "deterministic";

  const actions: DocumentToolbarAction[] = [
    {
      id: "studio",
      label: JOB_RESUME_STUDIO_LABEL,
      icon: "studio",
      variant: "mintOutline",
      href: entry.hasTailoredResume ? jobTrackerReviewStudioUrl(entry.id) : undefined,
      disabled: !entry.hasTailoredResume,
      title: entry.hasTailoredResume
        ? `Open ${JOB_RESUME_STUDIO_LABEL}`
        : "Tailor a resume for this job first",
    },
    {
      id: "enhance",
      label: aiEnabled ? "Enhance with AI" : "Enhance",
      icon: "enhance",
      variant: "outline",
      disabled: !entry.hasTailoredResume,
      busy: busy === "enhance",
      title: aiEnabled
        ? entry.hasTailoredResume
          ? undefined
          : "Tailor a resume for this job first"
        : "Enable AI in Settings for smarter enhancements",
      onClick: () => {
        void (async () => {
          if (
            !aiEnabled &&
            !window.confirm(
              "AI is off — rule-based enhance will rewrite summary and skills from the job description. Your experience bullets stay as-is. Continue?",
            )
          ) {
            return;
          }
          const startedAt = Date.now();
          trackEnhanceClicked({
            surface: "review_resume",
            documentKind: "resume",
            aiEnabled,
          });
          setBusy("enhance");
          setError(null);
          setEnhanceFeedback(null);
          const result: EnhanceResumeActionResult = await enhanceJobResumeFromReview(entry.id);
          setBusy(null);
          if (!result.success) {
            trackEnhanceCompleted({
              surface: "review_resume",
              documentKind: "resume",
              status: "error",
              durationMs: Date.now() - startedAt,
              errorCode: result.code ?? null,
            });
            setError(result.error);
            return;
          }
          trackEnhanceCompleted({
            surface: "review_resume",
            documentKind: "resume",
            status: "success",
            durationMs: Date.now() - startedAt,
            engineMode: result.engineMode,
            aiAttempted: result.aiAttempted,
            aiSucceeded: result.aiSucceeded,
            aiBlockCode: result.aiBlockCode ?? null,
            coveragePercent: result.coverageAfter?.coveragePercent ?? null,
            gapsCount: result.coverageAfter?.gaps.length ?? null,
          });
          setEnhanceFeedback({
            engineMode: result.engineMode ?? "ai",
            feedbackTier: result.feedbackTier,
            atsDelta: result.readinessDelta
              ? { before: result.readinessDelta.before, after: result.readinessDelta.after }
              : result.atsDelta ?? null,
            summary: result.enhanceSummary ?? result.fallbackSummary ?? null,
            warning: result.warning ?? null,
            coherenceWarnings: result.coherenceWarnings ?? null,
            suggestedTargetRoles: result.suggestedTargetRoles ?? null,
            coverageAfter: result.coverageAfter ?? null,
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
    ...(showBaseProfileExport
      ? [
          {
            id: "base-word",
            label: "Base Word",
            icon: "word" as const,
            variant: "outline" as const,
            disabled: !canExport,
            busy: busy === "base-word",
            title: "Export your base profile without JD keyword injection",
            onClick: () => void runExport("word", "base"),
          },
          {
            id: "base-pdf",
            label: "Base PDF",
            icon: "pdf" as const,
            variant: "outline" as const,
            disabled: !canExport,
            busy: busy === "base-pdf",
            title: "Export your base profile without JD keyword injection",
            onClick: () => void runExport("pdf", "base"),
          },
        ]
      : []),
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

  const persistedAiWarning = readPersistedAiWarning(entry);
  const showPersistedBanner = Boolean(persistedAiWarning) && !enhanceFeedback;

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
          <>
            <EnhanceFeedbackCard feedback={enhanceFeedback} />
            {enhanceFeedback.coverageAfter ? (
              <div className="absolute left-2 right-2 top-24 z-10 pointer-events-auto">
                <EnhanceCoveragePanel
                  coverageAfter={enhanceFeedback.coverageAfter}
                  engineMode={enhanceFeedback.engineMode}
                  warning={enhanceFeedback.warning ?? undefined}
                  enhanceSummary={enhanceFeedback.summary ?? undefined}
                />
              </div>
            ) : null}
          </>
        ) : null}

        <ReviewResumePreview
          previewHtml={preview.previewHtml}
          zoom={zoom}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {showPersistedBanner && persistedAiWarning ? (
        <div className="shrink-0 border-t border-border/60 bg-surface/80 p-2">
          <AiOutcomeBanner message={persistedAiWarning} />
        </div>
      ) : null}

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
