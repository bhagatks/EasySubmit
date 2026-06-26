"use client";

import { useCallback, useMemo, useState } from "react";
import {
  enhanceJobCoverLetter,
  exportReviewDocument,
  loadReviewLatexWorkspace,
  saveJobCoverLetter,
} from "@/app/actions/review-documents";
import { DocumentToolbar, type DocumentToolbarAction } from "@/components/dashboard/review/DocumentToolbar";
import { buildCoverContextFromEntry } from "@/components/dashboard/review/CoverLetterPreview";
import { LatexFullscreenEditor } from "@/components/dashboard/review/LatexFullscreenEditor";
import { ReviewDocumentPreview } from "@/components/dashboard/review/ReviewResumePreview";
import { ReviewPreviewZoomControls } from "@/components/dashboard/review/ReviewPreviewZoomControls";
import { base64ToUint8Array, downloadBytes } from "@/lib/job-tracker/export/download-client";
import { buildCoverLetterHtml } from "@/lib/job-tracker/cover-letter";
import {
  canExportReviewDocument,
  canOpenLatexEditor,
} from "@/lib/job-tracker/review-readiness";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import { DEFAULT_STUDIO_ZOOM } from "@/lib/resume/studio-preview-zoom";
import { cn } from "@/lib/utils";

type ReviewCoverPanelProps = {
  entry: JobTrackerDetail;
  onRefresh: () => void;
};

function splitName(full: string | undefined): { firstName: string; lastName: string } {
  const parts = full?.trim().split(/\s+/) ?? [];
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function ReviewCoverPanel({ entry, onRefresh }: ReviewCoverPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexPayload, setLatexPayload] = useState<{
    latex: string;
    previewHtml: string;
  } | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_STUDIO_ZOOM);

  const coverBody = entry.reviewDocuments?.coverLetter ?? "";
  const contact = entry.reviewContact;
  const nameParts = splitName(entry.tailoredResumePreview?.preview.fullName ?? undefined);

  const coverCtx = useMemo(
    () =>
      buildCoverContextFromEntry({
        firstName: contact?.firstName ?? nameParts.firstName,
        lastName: contact?.lastName ?? nameParts.lastName,
        email: contact?.email ?? null,
        phone: contact?.phone ?? null,
        company: entry.company,
        jobTitle: entry.title,
        body: coverBody,
      }),
    [contact, coverBody, entry.company, entry.title, nameParts],
  );

  const previewHtml = useMemo(() => buildCoverLetterHtml(coverCtx), [coverCtx]);

  const canExport = canExportReviewDocument({
    kind: "cover",
    hasTailoredResume: entry.hasTailoredResume,
    status: entry.status,
    resumeHasContent: Boolean(entry.tailoredResumePreview),
    coverLetter: coverBody,
  });

  const saveDraft = useCallback(async () => {
    setBusy("save");
    setError(null);
    const result = await saveJobCoverLetter({
      jobId: entry.id,
      coverLetter: draft,
    });
    setBusy(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    setDraft("");
    onRefresh();
  }, [draft, entry.id, onRefresh]);

  const runExport = useCallback(
    async (format: "pdf" | "word") => {
      setBusy(format);
      setError(null);
      const result = await exportReviewDocument({ jobId: entry.id, kind: "cover", format });
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
    const result = await loadReviewLatexWorkspace({ jobId: entry.id, kind: "cover" });
    setBusy(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setLatexPayload({ latex: result.latex, previewHtml: result.previewHtml });
    setLatexOpen(true);
  }, [entry.id]);

  const actions: DocumentToolbarAction[] = useMemo(() => {
    const editAction: DocumentToolbarAction =     {
      id: "edit",
      label: editing ? "Cancel edit" : "Edit",
      icon: "edit",
      disabled: !entry.hasTailoredResume,
      title: entry.hasTailoredResume
        ? undefined
        : "Tailor a resume for this job before saving a cover letter",
      onClick: () => {
        if (editing) {
          setEditing(false);
          setDraft("");
          return;
        }
        setDraft(coverBody);
        setEditing(true);
      },
    };

    if (editing) {
      return [
        {
          id: "save",
          label: "Save",
          icon: "edit",
          disabled: busy === "save",
          busy: busy === "save",
          onClick: () => void saveDraft(),
        },
        editAction,
      ];
    }

    return [
      editAction,
      {
        id: "enhance",
        label: "Enhance with AI",
        icon: "enhance",
        disabled: !entry.hasTailoredResume,
        busy: busy === "enhance",
        title: entry.hasTailoredResume ? undefined : "Tailor a resume for this job first",
        onClick: () => {
          void (async () => {
            setBusy("enhance");
            setError(null);
            setNotice(null);
            const result = await enhanceJobCoverLetter(entry.id);
            setBusy(null);
            if (!result.success) {
              setError(result.error);
              return;
            }
            if (result.fallbackUsed && result.fallbackSummary) {
              setNotice(result.fallbackSummary);
            }
            onRefresh();
          })();
        },
      },
      {
        id: "word",
        label: "Word",
        icon: "word",
        disabled: !canExport,
        busy: busy === "word",
        onClick: () => void runExport("word"),
      },
      {
        id: "pdf",
        label: "PDF",
        icon: "pdf",
        disabled: !canExport,
        busy: busy === "pdf",
        onClick: () => void runExport("pdf"),
      },
      {
        id: "latex",
        label: "LaTeX",
        icon: "latex",
        disabled: !canOpenLatexEditor({
          kind: "cover",
          hasTailoredResume: entry.hasTailoredResume,
          status: entry.status,
        }),
        busy: busy === "latex",
        onClick: () => void openLatex(),
      },
    ];
  }, [
    busy,
    canExport,
    coverBody,
    editing,
    entry.hasTailoredResume,
    entry.id,
    entry.status,
    onRefresh,
    openLatex,
    runExport,
    saveDraft,
  ]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 bg-white">
        <div className="pointer-events-none absolute inset-x-2 top-1.5 z-10 flex items-start justify-between gap-2">
          <DocumentToolbar
            actions={actions}
            appearance="overlay"
            className="pointer-events-auto min-w-0 flex-1"
          />
          {!editing ? (
            <ReviewPreviewZoomControls
              zoom={zoom}
              onChange={setZoom}
              className="pointer-events-auto"
            />
          ) : null}
        </div>

        {error ? (
          <p className="absolute left-2 right-2 top-11 z-10 rounded-lg border border-red-500/30 bg-[oklch(0.16_0.04_268/0.92)] px-3 py-1.5 text-xs text-red-300">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="absolute left-2 right-2 top-11 z-10 rounded-lg border border-amber-500/30 bg-[oklch(0.16_0.04_268/0.92)] px-3 py-1.5 text-xs text-amber-200">
            {notice}
          </p>
        ) : null}

        {editing ? (
          <div className="absolute inset-0 z-[1] flex min-h-0 flex-col bg-white pt-12">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={cn(
                "min-h-0 flex-1 resize-none border-0 bg-transparent px-4 pb-4",
                "font-serif text-sm leading-relaxed text-[#1f2937] placeholder:text-[#6b7280]",
                "focus-visible:outline-none",
              )}
              placeholder="Write your cover letter for this role…"
              aria-label="Cover letter body"
            />
          </div>
        ) : !coverBody.trim() ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-12 pt-14 text-center">
            <h3 className="font-display text-base font-semibold text-foreground">No cover letter yet</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {entry.hasTailoredResume
                ? "Use Enhance with AI to draft a letter for this role, or Edit to write your own."
                : "Tailor a resume for this job first — then you can generate or write a cover letter here."}
            </p>
          </div>
        ) : (
          <ReviewDocumentPreview
            previewHtml={previewHtml}
            zoom={zoom}
            title="Cover letter preview"
            className="absolute inset-0 h-full w-full"
          />
        )}
      </div>

      {latexOpen && latexPayload ? (
        <LatexFullscreenEditor
          open={latexOpen}
          onClose={() => setLatexOpen(false)}
          jobId={entry.id}
          kind="cover"
          title={`Cover letter · ${entry.company ?? "Job"}`}
          initialLatex={latexPayload.latex}
          initialPreviewHtml={latexPayload.previewHtml}
          onSaved={onRefresh}
        />
      ) : null}
    </div>
  );
}
