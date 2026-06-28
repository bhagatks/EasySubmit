"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, Loader2, RefreshCw, X } from "lucide-react";
import {
  compileReviewLatex,
  saveJobLatexSource,
} from "@/app/actions/review-documents";
import { Button } from "@/components/ui/button";
import { base64ToUint8Array, downloadBytes, copyTextToClipboard } from "@/lib/job-tracker/export/download-client";
import { exportReviewDocument } from "@/app/actions/review-documents";
import { trackResumeExported } from "@/src/shared/analytics";
import type { ReviewDocumentKind } from "@/lib/job-tracker/review-readiness";
import { cn } from "@/lib/utils";

type LatexFullscreenEditorProps = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  kind: ReviewDocumentKind;
  title: string;
  initialLatex: string;
  initialPreviewHtml: string;
  onSaved?: () => void;
};

export function LatexFullscreenEditor({
  open,
  onClose,
  jobId,
  kind,
  title,
  initialLatex,
  initialPreviewHtml,
  onSaved,
}: LatexFullscreenEditorProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [previewHtml, setPreviewHtml] = useState(initialPreviewHtml);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLatex(initialLatex);
    setPreviewHtml(initialPreviewHtml);
    setErrors([]);
    setDirty(false);
  }, [open, initialLatex, initialPreviewHtml]);

  const handleClose = useCallback(() => {
    if (dirty && !window.confirm("Discard unsaved LaTeX changes?")) return;
    onClose();
  }, [dirty, onClose]);

  const handleRecompile = useCallback(async () => {
    setBusy("compile");
    setErrors([]);
    const result = await compileReviewLatex({ jobId, kind, latex });
    setBusy(null);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setPreviewHtml(result.previewHtml);
  }, [jobId, kind, latex]);

  const handleSave = useCallback(async () => {
    setBusy("save");
    const result = await saveJobLatexSource({ jobId, kind, latex });
    setBusy(null);
    if (!result.success) {
      setErrors([result.error]);
      return;
    }
    setDirty(false);
    onSaved?.();
  }, [jobId, kind, latex, onSaved]);

  const handleCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(latex);
    if (!ok) setErrors(["Could not copy to clipboard."]);
  }, [latex]);

  const handleDownloadPdf = useCallback(async () => {
    setBusy("pdf");
    const result = await exportReviewDocument({ jobId, kind, format: "pdf" });
    setBusy(null);
    if (!result.success) {
      setErrors([result.error]);
      return;
    }
    trackResumeExported({
      surface: "latex_editor",
      format: "pdf",
      entryId: jobId,
    });
    downloadBytes({
      bytes: base64ToUint8Array(result.base64),
      filename: result.filename,
      mimeType: result.mimeType,
    });
  }, [jobId, kind]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            LaTeX
          </p>
          <h2 className="truncate font-display text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={Boolean(busy)}
            onClick={() => void handleRecompile()}
          >
            {busy === "compile" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Recompile
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={Boolean(busy)}
            onClick={() => void handleCopy()}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy source
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={Boolean(busy)}
            onClick={() => void handleSave()}
          >
            {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save
          </Button>
          <Button
            type="button"
            variant="mint"
            size="sm"
            className="rounded-xl"
            disabled={Boolean(busy)}
            onClick={() => void handleDownloadPdf()}
          >
            {busy === "pdf" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={handleClose}
          >
            <X className="h-3.5 w-3.5" />
            Close
          </Button>
        </div>
      </header>

      {errors.length > 0 ? (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {errors.join(" ")}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <p className="shrink-0 border-b border-border/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Source
          </p>
          <textarea
            value={latex}
            onChange={(event) => {
              setLatex(event.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            className={cn(
              "min-h-[240px] flex-1 resize-none border-0 bg-surface/40 p-4 font-mono text-xs leading-relaxed",
              "text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            )}
            aria-label="LaTeX source"
          />
        </div>
        <div className="flex min-h-0 flex-col">
          <p className="shrink-0 border-b border-border/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Output preview
          </p>
          <iframe
            title="LaTeX output preview"
            srcDoc={previewHtml}
            className="min-h-[240px] flex-1 bg-white"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
