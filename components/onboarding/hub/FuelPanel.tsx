"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { parseResumeFile } from "@/lib/resume/parseResumeClient";
import { AtsSamplePreviewLinks } from "@/components/onboarding/hub/AtsSamplePreviewLinks";
import { IngestionTerminal } from "@/components/onboarding/hub/IngestionTerminal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { WorkbenchPhaseIntro } from "@/components/onboarding/hub/WorkbenchPhaseIntro";
import type { CoordinatesValues } from "@/components/onboarding/hub/CoordinatesPanel";
import { advancingToNextPhaseLabel } from "@/lib/onboarding/workbenchPhases";
import { formatFullPhone } from "@/lib/phone/phone";
import type { StructuredResume } from "@/lib/resume/heuristicParser";
import {
  buildIngestionLogLines,
  buildProcessingLogLines,
  type IngestionLogLine,
} from "@/lib/resume/ingestionLog";
import { cn } from "@/lib/utils";

const PRIMARY = "oklch(0.62 0.21 265)";
const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";

const RESUME_ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
} as const;

const SUCCESS_HOLD_MS = 1400;

const TEMPLATE_LINK_CLASS = cn(
  "rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] underline-offset-2 transition-colors hover:bg-white/[0.06] hover:underline",
);

type FuelPanelProps = {
  monoClass: string;
  coordinates: CoordinatesValues;
  onParsed: (payload: { data: StructuredResume; rawText: string }) => void;
  onScanningChange: (scanning: boolean) => void;
  /** Skip file upload and open Studio with identity fields prefilled. */
  onSkipManual?: () => void;
  hidePhaseIntro?: boolean;
  successAdvanceLabel?: string;
};

export function FuelPanel({
  monoClass,
  coordinates,
  onParsed,
  onScanningChange,
  onSkipManual,
  hidePhaseIntro = false,
  successAdvanceLabel,
}: FuelPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<IngestionLogLine[]>([]);
  const parsedRef = useRef<{ data: StructuredResume; rawText: string } | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const animateProcessingLog = useCallback(() => {
    const base = buildProcessingLogLines();
    setLogLines([base[0]]);

    window.setTimeout(() => {
      setLogLines([base[0], { ...base[1], status: "active" }]);
    }, 400);

    window.setTimeout(() => {
      setLogLines([
        { ...base[0], status: "done" },
        { ...base[1], status: "done" },
        { ...base[2], status: "active" },
      ]);
    }, 900);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setFileError(null);
      setShowSuccess(false);
      setIsProcessing(true);
      onScanningChange(true);
      setProcessingFileName(file.name);
      parsedRef.current = null;
      animateProcessingLog();

      try {
        const result = await parseResumeFile(file);

        if (!result.success) {
          throw new Error(result.error);
        }

        parsedRef.current = { data: result.data, rawText: result.meta.rawText };
        setLogLines(buildIngestionLogLines(result.data, result.meta));
        setShowSuccess(true);
        onScanningChange(false);

        advanceTimerRef.current = window.setTimeout(() => {
          if (parsedRef.current) {
            onParsed(parsedRef.current);
          }
        }, SUCCESS_HOLD_MS);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to parse resume";
        setFileError(message);
        setLogLines((current) => [
          ...current,
          {
            id: "error",
            prefix: "[SYNC]",
            message,
            status: "error",
          },
        ]);
        onScanningChange(false);
        setIsProcessing(false);
        setProcessingFileName(null);
      }
    },
    [animateProcessingLog, onParsed, onScanningChange],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: RESUME_ACCEPT,
      maxFiles: 1,
      multiple: false,
      disabled: isProcessing,
      onDrop,
      onDropRejected: () =>
        setFileError("PDF or DOCX only — drop a supported resume file."),
    });

  return (
    <div className="flex flex-1 flex-col">
      {!hidePhaseIntro ? (
        <WorkbenchPhaseIntro
          phaseId={2}
          monoClass={monoClass}
          icon={<FileUp className="h-3.5 w-3.5" aria-hidden="true" />}
          actions={
            <AtsSamplePreviewLinks
              monoClass={monoClass}
              linkClassName={TEMPLATE_LINK_CLASS}
              linkColor={PRIMARY}
            />
          }
        />
      ) : null}

      {(coordinates.firstName || coordinates.email) && (
        <div
          className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs leading-relaxed"
          style={{ color: MUTED }}
        >
          <p
            className={cn(monoClass, "mb-0.5 text-[10px] uppercase tracking-[0.14em]")}
            style={{ color: MINT }}
          >
            From Identity
          </p>
          <p style={{ color: "oklch(0.98 0.01 268)" }}>
            {[coordinates.firstName, coordinates.lastName].filter(Boolean).join(" ") ||
              "—"}
          </p>
          <p>
            {[coordinates.cityState, formatFullPhone(coordinates.phoneDialCode, coordinates.phone), coordinates.email]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
      )}

      <div
        {...getRootProps({
          className: cn(
            "relative mt-4 flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-6 py-10 transition-all duration-300",
            "border-[oklch(0.62_0.21_265_/_0.25)] bg-[oklch(0.62_0.21_265_/_0.04)]",
            isProcessing && "cursor-wait border-[oklch(0.62_0.21_265_/_0.55)]",
            showSuccess && "border-[oklch(0.82_0.16_165_/_0.5)]",
            !isProcessing &&
              !showSuccess &&
              isDragActive &&
              !isDragReject &&
              "border-[oklch(0.82_0.16_165_/_0.6)] bg-[oklch(0.82_0.16_165_/_0.06)] shadow-[0_0_48px_-8px_oklch(0.82_0.16_165_/_0.55)]",
            isDragReject && "border-[oklch(0.65_0.2_25_/_0.5)] bg-[oklch(0.65_0.2_25_/_0.06)]",
          ),
        })}
      >
        <input {...getInputProps()} aria-label="Upload resume PDF or DOCX" />

        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <CheckCircle2
                className="h-12 w-12"
                style={{ color: MINT }}
                aria-hidden="true"
              />
              <p
                className="mt-3 text-sm font-semibold"
                style={{ color: "oklch(0.98 0.01 268)" }}
              >
                Ingestion complete
              </p>
              <p
                className={cn(monoClass, "mt-1 text-[10px] uppercase tracking-[0.12em]")}
                style={{ color: MUTED }}
              >
                {successAdvanceLabel ?? advancingToNextPhaseLabel(2)}
              </p>
            </motion.div>
          ) : isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <Loader2
                className="h-10 w-10 animate-spin"
                style={{ color: PRIMARY }}
                aria-hidden="true"
              />
              <p
                className="mt-4 text-sm font-semibold"
                style={{ color: "oklch(0.98 0.01 268)" }}
              >
                Scanning resume…
              </p>
              {processingFileName ? (
                <p
                  className={cn(
                    monoClass,
                    "mt-1 max-w-[240px] truncate text-[10px] uppercase tracking-[0.12em]",
                  )}
                  style={{ color: MUTED }}
                >
                  {processingFileName}
                </p>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                style={{
                  boxShadow: "0 0 32px -8px oklch(0.62 0.21 265 / 0.35)",
                }}
              >
                <Upload
                  className="h-8 w-8"
                  style={{ color: PRIMARY }}
                  strokeWidth={1.75}
                />
              </div>
              <p
                className="mt-4 text-sm font-semibold"
                style={{ color: "oklch(0.98 0.01 268)" }}
              >
                {isDragActive ? "Release to upload" : "Drop PDF or DOCX here"}
              </p>
              <p
                className={cn(monoClass, "mt-1 text-[10px] uppercase tracking-[0.14em]")}
                style={{ color: MUTED }}
              >
                or click to browse
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <IngestionTerminal lines={logLines} monoClass={monoClass} />

      {onSkipManual && !isProcessing && !showSuccess ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onSkipManual}
            className={cn(
              monoClass,
              "rounded-xl px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-white/[0.06]",
            )}
            style={{ color: PRIMARY }}
          >
            Skip upload — build resume manually
          </button>
        </div>
      ) : null}

      {fileError ? (
        <InlineAlert surface="glass" variant="error" className="mt-4">
          {fileError}
        </InlineAlert>
      ) : null}
    </div>
  );
}
