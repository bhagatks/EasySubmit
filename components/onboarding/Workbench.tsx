"use client";

import { JetBrains_Mono } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  Crosshair,
  DollarSign,
  Fuel,
  Loader2,
  Upload,
} from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { parseResumeFile } from "@/lib/resume/parseResumeClient";
import { RefinerySession } from "@/components/onboarding/RefinerySession";
import { PrimeResume } from "@/components/resume/PrimeResume";
import { ScanningBeam } from "@/components/resume/ScanningBeam";
import {
  emptyRefineryForm,
  toPrimeResumeData,
  toRefineryForm,
  type RefineryFormValues,
} from "@/lib/resume/refineryForm";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboardingStore";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

const RESUME_ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
} as const;

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/45 focus:outline-none focus:ring-1 focus:ring-primary/30";

const panelVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 28 : -28,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
  }),
};

const panelTransition = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

type WorkbenchStep = "coordinates" | "fuel" | "refinery";

const STEP_ORDER: WorkbenchStep[] = ["coordinates", "fuel", "refinery"];

const EMPTY_CANVAS = toPrimeResumeData(emptyRefineryForm());

function stepProgress(step: WorkbenchStep): number {
  const index = STEP_ORDER.indexOf(step);
  return Math.round(((index + 1) / STEP_ORDER.length) * 100);
}

function EngineLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
    >
      {children}
    </label>
  );
}

function CoordinatesPanel({
  targetRole,
  minSalary,
  onTargetRoleChange,
  onMinSalaryChange,
  onContinue,
}: {
  targetRole: string;
  minSalary: string;
  onTargetRoleChange: (value: string) => void;
  onMinSalaryChange: (value: string) => void;
  onContinue: () => void;
}) {
  const parsedSalary = Number(minSalary.replace(/,/g, ""));
  const isValid =
    targetRole.trim().length > 0 &&
    Number.isFinite(parsedSalary) &&
    parsedSalary >= 30_000;

  return (
    <div className="flex flex-1 flex-col">
      <p
        className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary"
        style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
      >
        <Crosshair className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
        Step 1 · Coordinates
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Set your target coordinates
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Tell the engine where you&apos;re headed — role and salary floor.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (isValid) onContinue();
        }}
      >
        <div>
          <EngineLabel htmlFor="wb-target-role">Target Role</EngineLabel>
          <div className="relative">
            <Briefcase
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="wb-target-role"
              value={targetRole}
              onChange={(event) => onTargetRoleChange(event.target.value)}
              placeholder="Senior Software Engineer"
              className={cn(INPUT_CLASS, "pl-10")}
            />
          </div>
        </div>

        <div>
          <EngineLabel htmlFor="wb-min-salary">Minimum Salary (USD)</EngineLabel>
          <div className="relative">
            <DollarSign
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="wb-min-salary"
              inputMode="numeric"
              value={minSalary}
              onChange={(event) => onMinSalaryChange(event.target.value)}
              placeholder="120000"
              className={cn(INPUT_CLASS, "pl-10")}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </form>
    </div>
  );
}

function FuelPanel({
  isProcessing,
  fileError,
  processingFileName,
  onDropFile,
  onReject,
}: {
  isProcessing: boolean;
  fileError: string | null;
  processingFileName: string | null;
  onDropFile: (file: File) => void;
  onReject: () => void;
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) onDropFile(file);
    },
    [onDropFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: RESUME_ACCEPT,
      maxFiles: 1,
      multiple: false,
      disabled: isProcessing,
      onDrop,
      onDropRejected: onReject,
    });

  return (
    <div className="flex flex-1 flex-col">
      <p
        className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary"
        style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
      >
        <Fuel className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
        Step 2 · Fuel
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Load your resume
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Upload PDF or Word — we&apos;ll parse it in memory and tune the preview.
      </p>

      <div
        {...getRootProps({
          className: cn(
            "relative mt-8 flex min-h-[280px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-6 py-12 transition-all duration-300",
            "border-white/15 bg-white/[0.03]",
            isProcessing && "cursor-wait border-primary/50 bg-primary/5",
            !isProcessing &&
              isDragActive &&
              !isDragReject &&
              "border-primary/60 bg-primary/5",
            isDragReject && "border-destructive/50 bg-destructive/5",
          ),
        })}
      >
        <input {...getInputProps()} aria-label="Upload resume PDF or DOCX" />

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-foreground">
                Parsing resume…
              </p>
              {processingFileName ? (
                <p className="mt-1 max-w-[240px] truncate text-xs text-muted-foreground">
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
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Upload className="h-7 w-7 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                {isDragActive ? "Release to upload" : "Drop PDF or DOCX here"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {fileError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
        >
          {fileError}
        </p>
      ) : null}
    </div>
  );
}

export function Workbench() {
  const setSelectedRole = useOnboardingStore((s) => s.setSelectedRole);
  const setMinSalary = useOnboardingStore((s) => s.setMinSalary);

  const [currentStep, setCurrentStep] = useState<WorkbenchStep>("coordinates");
  const [direction, setDirection] = useState(1);
  const [targetRole, setTargetRole] = useState("");
  const [minSalary, setMinSalaryLocal] = useState("");
  const [refineryInitial, setRefineryInitial] = useState<RefineryFormValues>(
    emptyRefineryForm(),
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processingFileName, setProcessingFileName] = useState<string | null>(
    null,
  );
  const [refineryKey, setRefineryKey] = useState(0);

  const goToStep = useCallback((next: WorkbenchStep) => {
    setCurrentStep((prev) => {
      setDirection(STEP_ORDER.indexOf(next) >= STEP_ORDER.indexOf(prev) ? 1 : -1);
      return next;
    });
  }, []);

  const handleCoordinatesContinue = useCallback(() => {
    const parsedSalary = Number(minSalary.replace(/,/g, ""));
    setSelectedRole(targetRole.trim());
    setMinSalary(Math.round(parsedSalary / 1000));
    goToStep("fuel");
  }, [goToStep, minSalary, setMinSalary, setSelectedRole, targetRole]);

  const processFile = useCallback(
    async (file: File) => {
      setFileError(null);
      setIsProcessing(true);
      setIsScanning(true);
      setProcessingFileName(file.name);

      try {
        const result = await parseResumeFile(file);

        if (!result.success) {
          throw new Error(result.error);
        }

        setRefineryInitial(toRefineryForm(result.data, targetRole.trim()));
        setRefineryKey((key) => key + 1);
        goToStep("refinery");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to parse resume";
        setFileError(message);
      } finally {
        setIsProcessing(false);
        setIsScanning(false);
        setProcessingFileName(null);
      }
    },
    [goToStep, targetRole],
  );

  return (
    <div
      className={cn(
        jetbrainsMono.variable,
        "flex h-screen min-h-0 flex-col overflow-hidden bg-background",
      )}
    >
      <div
        className="h-1 w-full shrink-0 bg-surface"
        role="progressbar"
        aria-valuenow={stepProgress(currentStep)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Workbench progress"
      >
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${stepProgress(currentStep)}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        {currentStep === "refinery" ? (
          <RefinerySession
            key={refineryKey}
            formKey={refineryKey}
            initialValues={refineryInitial}
          />
        ) : (
          <>
            <section
              aria-label="Resume canvas"
              className="relative min-h-0 w-[60%] shrink-0 overflow-y-auto bg-background px-6 py-10 sm:px-10"
            >
              <div className="mx-auto flex w-full max-w-[210mm] justify-center py-4">
                <div className="relative w-full">
                  <PrimeResume data={EMPTY_CANVAS} />
                  <ScanningBeam active={isScanning} />
                </div>
              </div>
            </section>

            <section
              aria-label="Engine tuning"
              className="flex min-h-0 w-[40%] shrink-0 flex-col border-l border-border bg-surface"
            >
              <header className="shrink-0 border-b border-white/10 px-6 py-5">
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
                >
                  Engine Tuning
                </p>
              </header>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
                <AnimatePresence mode="wait" custom={direction}>
                  {currentStep === "coordinates" && (
                    <motion.div
                      key="coordinates"
                      custom={direction}
                      variants={panelVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={panelTransition}
                      className="flex flex-1 flex-col"
                    >
                      <CoordinatesPanel
                        targetRole={targetRole}
                        minSalary={minSalary}
                        onTargetRoleChange={setTargetRole}
                        onMinSalaryChange={setMinSalaryLocal}
                        onContinue={handleCoordinatesContinue}
                      />
                    </motion.div>
                  )}

                  {currentStep === "fuel" && (
                    <motion.div
                      key="fuel"
                      custom={direction}
                      variants={panelVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={panelTransition}
                      className="flex flex-1 flex-col"
                    >
                      <FuelPanel
                        isProcessing={isProcessing}
                        fileError={fileError}
                        processingFileName={processingFileName}
                        onDropFile={(file) => void processFile(file)}
                        onReject={() =>
                          setFileError(
                            "PDF or DOCX only — drop a supported resume file.",
                          )
                        }
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
