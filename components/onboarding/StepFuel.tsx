"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Fuel, Loader2, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { updateUserOnboarding } from "@/app/actions/onboarding";
import {
  processResume,
  type ProcessResumeResult,
} from "@/app/actions/process-resume";
import { cn } from "@/lib/utils";
import type { ParsedResumeData } from "@/stores/onboardingStore";
import { useOnboardingStore } from "@/stores/onboardingStore";

const PDF_ACCEPT = {
  "application/pdf": [".pdf"],
} as const;

const MINT = "oklch(0.82 0.16 165)";
const MINT_GLOW = "0 0 48px -8px oklch(0.82 0.16 165 / 0.55)";

export type FuelCompletePayload = {
  parsedData: ParsedResumeData;
};

interface StepFuelProps {
  onComplete?: (payload: FuelCompletePayload) => void;
  onSkip?: () => void;
  onProcessingChange?: (processing: boolean) => void;
}

function toParsedResumeData(result: ProcessResumeResult): ParsedResumeData {
  return {
    rawText: result.rawText,
    email: result.email,
    phone: result.phone,
    linkedIn: result.linkedIn,
    skills: result.skills,
  };
}

function MintScanOverlay() {
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 z-20 h-16 -translate-y-1/2"
        style={{
          background: `linear-gradient(180deg, transparent, oklch(0.82 0.16 165 / 0.22), transparent)`,
        }}
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{
          duration: 1.8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 z-30 h-px -translate-y-1/2"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.82 0.16 165), transparent)",
          boxShadow:
            "0 0 12px 2px oklch(0.82 0.16 165 / 0.9), 0 0 32px 6px oklch(0.82 0.16 165 / 0.35)",
        }}
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{
          duration: 1.8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "repeating-linear-gradient(0deg, oklch(0.82 0.16 165 / 0.04) 0px, transparent 2px, transparent 6px)",
        }}
        animate={{ opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export default function StepFuel({
  onComplete,
  onSkip,
  onProcessingChange,
}: StepFuelProps) {
  const { update: updateSession } = useSession();
  const setResumeSkipped = useOnboardingStore((s) => s.setResumeSkipped);
  const setParsedResumeData = useOnboardingStore((s) => s.setParsedResumeData);
  const setFuelProcessed = useOnboardingStore((s) => s.setFuelProcessed);

  const [isProcessing, setIsProcessing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processingFileName, setProcessingFileName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    onProcessingChange?.(isProcessing);
  }, [isProcessing, onProcessingChange]);

  const processFile = useCallback(
    async (file: File) => {
      setFileError(null);
      setIsProcessing(true);
      setProcessingFileName(file.name);
      setFuelProcessed(false);

      try {
        const formData = new FormData();
        formData.set("file", file);

        const result = await processResume(formData);

        if (!result.success) {
          throw new Error(result.error);
        }

        const parsedData = toParsedResumeData(result);

        setParsedResumeData(parsedData);
        setFuelProcessed(true);
        useOnboardingStore.setState({
          resumeFile: null,
          resumeFileName: file.name,
          resumePreviewUrl: null,
          resumeSkipped: false,
        });

        onComplete?.({ parsedData });

        void updateUserOnboarding(3, {
          resumeRawText: parsedData.rawText,
          skills: parsedData.skills,
          phone: parsedData.phone ?? undefined,
          email: parsedData.email ?? undefined,
          parsedData: {
            email: parsedData.email,
            phone: parsedData.phone,
            linkedIn: parsedData.linkedIn,
            skills: parsedData.skills,
          },
        }).then(() => updateSession({ onboardingStep: 3 }));
      } catch (error) {
        setFuelProcessed(false);
        setProcessingFileName(null);

        const message =
          error instanceof Error ? error.message : "Failed to process resume";
        setFileError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [onComplete, setFuelProcessed, setParsedResumeData, updateSession],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: PDF_ACCEPT,
      maxFiles: 1,
      multiple: false,
      disabled: isProcessing,
      noClick: isProcessing,
      noKeyboard: isProcessing,
      onDrop,
      onDropRejected: () => {
        setFileError("PDF only — drop a .pdf file to fuel the engine.");
      },
    });

  const handleSkip = () => {
    if (isProcessing) return;

    setFileError(null);
    setResumeSkipped(true);
    onSkip?.();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-xl"
          aria-hidden="true"
        >
          <Fuel className="h-3 w-3 text-[oklch(0.62_0.21_265)]" />
          Fuel Loading Bay
        </span>
      </div>

      <h1 className="mt-4 font-display text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
        Load your resume into the engine
      </h1>
      <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-muted-foreground">
        Drop a PDF into the bay — we&apos;ll scan essentials and skills instantly,
        no AI keys required.
      </p>

      <div
        {...getRootProps({
          className: cn(
            "relative mt-8 flex min-h-[300px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-6 py-14 transition-all duration-300 sm:min-h-[340px]",
            "border-white/15 bg-surface/60 shadow-elevated backdrop-blur-2xl",
            isProcessing &&
              "cursor-wait border-[oklch(0.82_0.16_165_/_0.55)] bg-[oklch(0.82_0.16_165_/_0.06)]",
            !isProcessing &&
              isDragActive &&
              !isDragReject &&
              "border-[oklch(0.62_0.21_265_/_0.6)] bg-[oklch(0.62_0.21_265_/_0.06)]",
            !isProcessing &&
              !isDragActive &&
              "hover:border-[oklch(0.62_0.21_265_/_0.4)] hover:bg-white/[0.04]",
            isDragReject && "border-destructive/50 bg-destructive/5",
          ),
          style: isProcessing ? { boxShadow: MINT_GLOW } : undefined,
        })}
      >
        <input {...getInputProps()} aria-label="Upload resume PDF" />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `
              linear-gradient(to right, oklch(0.62 0.21 265 / 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, oklch(0.62 0.21 265 / 0.12) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
          }}
        />

        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-1.5 transition-colors duration-300",
            isProcessing
              ? "bg-[oklch(0.82_0.16_165)]"
              : "bg-[oklch(0.62_0.21_265_/_0.5)]",
          )}
        />

        {isProcessing && <MintScanOverlay />}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60"
        >
          <span>Bay 01</span>
          <span>{isProcessing ? "Scanning payload" : "Awaiting payload"}</span>
          <span>PDF</span>
        </div>

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative z-20 flex flex-col items-center text-center"
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl border border-[oklch(0.82_0.16_165_/_0.45)] bg-[oklch(0.82_0.16_165_/_0.12)] backdrop-blur-xl"
                style={{ boxShadow: MINT_GLOW }}
              >
                <Loader2
                  className="h-8 w-8 animate-spin"
                  style={{ color: MINT }}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-5 font-display text-base font-semibold text-foreground">
                Scanning fuel payload…
              </p>
              <p className="mt-1 font-body text-sm" style={{ color: MINT }}>
                Extracting essentials &amp; skills
              </p>
              {processingFileName && (
                <p className="mt-3 max-w-[260px] truncate font-body text-xs text-muted-foreground">
                  {processingFileName}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="relative z-20 flex flex-col items-center text-center"
            >
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-xl border backdrop-blur-xl transition-colors duration-300",
                  isDragActive
                    ? "border-[oklch(0.62_0.21_265_/_0.5)] bg-[oklch(0.62_0.21_265_/_0.12)]"
                    : "border-white/10 bg-white/[0.04]",
                )}
              >
                <Upload
                  className={cn(
                    "h-8 w-8 transition-colors duration-300",
                    isDragActive
                      ? "text-[oklch(0.62_0.21_265)]"
                      : "text-muted-foreground",
                  )}
                  strokeWidth={1.75}
                />
              </div>
              <p className="mt-5 font-display text-base font-semibold text-foreground">
                {isDragActive ? "Release to load fuel" : "Drop your resume here"}
              </p>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                or click to browse · PDF only
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {fileError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 font-body text-sm text-destructive-foreground"
        >
          {fileError}
        </p>
      )}

      {!isProcessing && (
        <button
          type="button"
          onClick={handleSkip}
          className="mt-5 text-left font-body text-sm font-medium text-[oklch(0.62_0.21_265)] transition-opacity hover:opacity-80"
        >
          I&apos;ll fill my experience manually →
        </button>
      )}
    </div>
  );
}
