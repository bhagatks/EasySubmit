"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  ChevronDown,
  Crosshair,
  DollarSign,
  MapPin,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { completeStep } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboardingStore";

const WORK_MODES = ["Remote", "Hybrid", "On-site"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

const PRIMARY = "oklch(0.62 0.21 265)";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-body text-sm text-foreground shadow-sm placeholder:text-muted-foreground transition-colors focus:border-[oklch(0.62_0.21_265_/_0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265_/_0.35)]";

interface WorkModeDropdownProps {
  value: WorkMode | null;
  onChange: (mode: WorkMode) => void;
  disabled?: boolean;
}

function WorkModeDropdown({ value, onChange, disabled = false }: WorkModeDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const select = useCallback(
    (mode: WorkMode) => {
      onChange(mode);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative">
      <label
        id={`${listboxId}-label`}
        className="mb-2 flex items-center gap-2 font-body text-sm font-medium text-foreground"
      >
        <MapPin className="h-4 w-4 text-[oklch(0.82_0.16_165)]" aria-hidden="true" />
        Work Mode
      </label>

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listboxId}-label`}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left font-body text-sm backdrop-blur-xl transition-colors",
          open && "border-[oklch(0.62_0.21_265_/_0.4)] ring-1 ring-[oklch(0.62_0.21_265_/_0.25)]",
          !value && "text-muted-foreground",
        )}
      >
        <span>{value ?? "Select work mode"}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listboxId}
            role="listbox"
            aria-labelledby={`${listboxId}-label`}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-surface/60 shadow-elevated backdrop-blur-2xl"
          >
            {WORK_MODES.map((mode) => {
              const selected = value === mode;
              return (
                <li key={mode} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(mode)}
                    className={cn(
                      "w-full px-4 py-3 text-left font-body text-sm font-medium transition-colors duration-150",
                      selected
                        ? "bg-[oklch(0.62_0.21_265_/_0.18)] text-foreground"
                        : "text-foreground hover:bg-[oklch(0.62_0.21_265_/_0.12)]",
                    )}
                    style={
                      selected
                        ? { boxShadow: `inset 3px 0 0 0 ${PRIMARY}` }
                        : undefined
                    }
                  >
                    {mode}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

interface StepCoordinatesProps {
  onNext?: () => void;
  hideSubmitButton?: boolean;
  formId?: string;
  onValidityChange?: (valid: boolean) => void;
  /** Server onboarding step number passed to completeStep (default 1). */
  persistStepNumber?: number;
  /** Pre-fill target title from OAuth headline or stored role. */
  initialTargetTitle?: string;
}

export default function StepCoordinates({
  onNext,
  hideSubmitButton = false,
  formId,
  onValidityChange,
  persistStepNumber = 1,
  initialTargetTitle = "",
}: StepCoordinatesProps) {
  const { update: updateSession } = useSession();
  const setSelectedRole = useOnboardingStore((s) => s.setSelectedRole);
  const setMinSalary = useOnboardingStore((s) => s.setMinSalary);
  const setWorkModeStore = useOnboardingStore((s) => s.setWorkMode);

  const [targetJobTitle, setTargetJobTitle] = useState("");
  const [minimumSalary, setMinimumSalary] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefillApplied = useRef(false);

  useEffect(() => {
    if (prefillApplied.current || !initialTargetTitle.trim()) {
      return;
    }

    setTargetJobTitle((current) => current || initialTargetTitle.trim());
    prefillApplied.current = true;
  }, [initialTargetTitle]);

  const parsedSalary = Number(minimumSalary.replace(/,/g, ""));
  const isValid =
    targetJobTitle.trim().length > 0 &&
    Number.isFinite(parsedSalary) &&
    parsedSalary >= 30_000 &&
    workMode !== null;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || isSubmitting || !workMode) return;

    setIsSubmitting(true);
    setError(null);

    const title = targetJobTitle.trim();
    const minSalaryThousands = Math.round(parsedSalary / 1000);

    try {
      const result = await completeStep(persistStepNumber, {
        targetTitle: title,
        minSalary: minSalaryThousands,
        workMode,
      });

      await updateSession({ onboardingStep: result.onboardingStep });

      setSelectedRole(title);
      setMinSalary(minSalaryThousands);
      setWorkModeStore(workMode);
      onNext?.();
    } catch {
      setError("We couldn't save your calibration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-1 flex-col"
    >
      <p className="flex items-center gap-2 font-body text-xs font-medium uppercase tracking-[0.18em] text-[oklch(0.82_0.16_165)]">
        <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
        Step 1 · Coordinates
      </p>
      <h1 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
        Set your target coordinates
      </h1>
      <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-muted-foreground">
        Dial in the role, salary floor, and work mode so the engine knows where to
        aim.
      </p>

      <form
        id={formId}
        onSubmit={handleSubmit}
        className="mt-8 flex flex-1 flex-col"
      >
        <div className="space-y-5">
          <div>
              <label
                htmlFor="target-job-title"
                className="mb-2 flex items-center gap-2 font-body text-sm font-medium text-foreground"
              >
                <Briefcase
                  className="h-4 w-4 text-[oklch(0.82_0.16_165)]"
                  aria-hidden="true"
                />
                Target Job Title
              </label>
              <input
                id="target-job-title"
                type="text"
                value={targetJobTitle}
                onChange={(event) => setTargetJobTitle(event.target.value)}
                placeholder="e.g. Senior Product Manager"
                autoComplete="organization-title"
                className={inputClassName}
              />
          </div>

          <div>
              <label
                htmlFor="minimum-salary"
                className="mb-2 flex items-center gap-2 font-body text-sm font-medium text-foreground"
              >
                <DollarSign
                  className="h-4 w-4 text-[oklch(0.82_0.16_165)]"
                  aria-hidden="true"
                />
                Min Salary
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-body text-sm text-[oklch(0.82_0.16_165)]">
                  $
                </span>
                <input
                  id="minimum-salary"
                  type="text"
                  inputMode="numeric"
                  value={minimumSalary}
                  onChange={(event) =>
                    setMinimumSalary(event.target.value.replace(/[^\d,]/g, ""))
                  }
                  placeholder="85,000"
                  className={`${inputClassName} pl-8`}
                />
              </div>
              <p className="mt-2 font-body text-xs text-muted-foreground">
                USD per year · minimum $30,000
              </p>
          </div>

          <WorkModeDropdown
            value={workMode}
            onChange={setWorkMode}
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          >
            {error}
          </p>
        )}

        {!hideSubmitButton && (
          <div className="mt-auto pt-10">
            <Button
              type="submit"
              variant="hero"
              size="xl"
              disabled={!isValid || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Saving…" : "Continue"}
            </Button>
          </div>
        )}
      </form>
    </motion.div>
  );
}
