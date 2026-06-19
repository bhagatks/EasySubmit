"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { updateUserOnboarding } from "@/app/actions/onboarding";
import StepCalibration from "@/components/onboarding/StepCalibration";
import StepCoordinates from "@/components/onboarding/StepCoordinates";
import StepFuel from "@/components/onboarding/StepFuel";
import StepRefinery from "@/components/onboarding/StepRefinery";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboardingStore";

const TOTAL_STEPS = 4;
const COORDINATES_FORM_ID = "onboarding-step-1-form";
const REFINERY_FORM_ID = "onboarding-step-3-form";
const PRIMARY = "oklch(0.62 0.21 265)";

const WIZARD_STEP = {
  COORDINATES: 1,
  FUEL: 2,
  REFINERY: 3,
  CALIBRATION: 4,
} as const;

type WizardStep = (typeof WIZARD_STEP)[keyof typeof WIZARD_STEP];

interface WizardMachineState {
  step: WizardStep;
  direction: 1 | -1;
  isAdvancing: boolean;
  coordinatesValid: boolean;
  refineryValid: boolean;
}

type WizardAction =
  | { type: "SYNC_FROM_SESSION"; step: WizardStep }
  | { type: "SET_COORDINATES_VALID"; valid: boolean }
  | { type: "SET_REFINERY_VALID"; valid: boolean }
  | { type: "NAVIGATE"; step: WizardStep; direction: 1 | -1 }
  | { type: "SET_ADVANCING"; value: boolean };

const initialMachineState: WizardMachineState = {
  step: WIZARD_STEP.COORDINATES,
  direction: 1,
  isAdvancing: false,
  coordinatesValid: false,
  refineryValid: false,
};

function sessionToWizardStep(
  onboardingStep: number,
  hasRefineryDraft: boolean,
): WizardStep {
  if (onboardingStep >= 4) return WIZARD_STEP.CALIBRATION;
  if (onboardingStep >= 3 && hasRefineryDraft) return WIZARD_STEP.CALIBRATION;
  if (onboardingStep >= 3) return WIZARD_STEP.REFINERY;
  if (onboardingStep >= 2) return WIZARD_STEP.FUEL;
  return WIZARD_STEP.COORDINATES;
}

function wizardReducer(
  state: WizardMachineState,
  action: WizardAction,
): WizardMachineState {
  switch (action.type) {
    case "SYNC_FROM_SESSION":
      return { ...state, step: action.step };
    case "SET_COORDINATES_VALID":
      return { ...state, coordinatesValid: action.valid };
    case "SET_REFINERY_VALID":
      return { ...state, refineryValid: action.valid };
    case "NAVIGATE":
      return {
        ...state,
        step: action.step,
        direction: action.direction,
      };
    case "SET_ADVANCING":
      return { ...state, isAdvancing: action.value };
    default:
      return state;
  }
}

function getSocialHeadlinePrefill(
  provider: string | undefined,
  name: string | null | undefined,
  storedRole: string | null,
): string {
  if (storedRole?.trim()) {
    return storedRole.trim();
  }

  if (!name?.trim()) {
    return "";
  }

  if (provider === "linkedin") {
    const pipeSegments = name.split("|").map((segment) => segment.trim());
    if (pipeSegments.length > 1 && pipeSegments[1].length > 2) {
      return pipeSegments[1];
    }

    const atMatch = name.match(/^(.+?)\s+at\s+(.+)$/i);
    if (atMatch?.[1] && atMatch[1].trim().length > 2) {
      return atMatch[1].trim();
    }
  }

  return "";
}

const stepMotion = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 28 : -28,
    filter: "blur(6px)",
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
    filter: "blur(4px)",
  }),
};

const stepTransition = {
  duration: 0.42,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

function WizardProgressBar({ step }: { step: number }) {
  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-label={`Onboarding progress: step ${step} of ${TOTAL_STEPS}`}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: PRIMARY }}
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  );
}

interface WizardNavButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "back" | "next";
  className?: string;
}

function WizardNavButton({
  children,
  onClick,
  disabled = false,
  variant,
  className,
}: WizardNavButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-body text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40",
        variant === "back" &&
          "border border-white/10 bg-white/[0.04] text-foreground hover:border-[oklch(0.62_0.21_265_/_0.35)] hover:bg-[oklch(0.62_0.21_265_/_0.08)] hover:shadow-[0_0_32px_-10px_oklch(0.62_0.21_265_/_0.45)]",
        variant === "next" &&
          "bg-[oklch(0.62_0.21_265)] text-[oklch(0.98_0.01_250)] shadow-[0_0_40px_-12px_oklch(0.62_0.21_265_/_0.55)] hover:brightness-110 hover:shadow-[0_0_52px_-8px_oklch(0.62_0.21_265_/_0.7)]",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export default function OnboardingWizard() {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const [state, dispatch] = useReducer(wizardReducer, initialMachineState);
  const [isFuelProcessing, setIsFuelProcessing] = useState(false);

  const resumeSkipped = useOnboardingStore((s) => s.resumeSkipped);
  const fuelProcessed = useOnboardingStore((s) => s.fuelProcessed);
  const setResumeSkipped = useOnboardingStore((s) => s.setResumeSkipped);
  const selectedRole = useOnboardingStore((s) => s.selectedRole);
  const refineryDraft = useOnboardingStore((s) => s.refineryDraft);

  const { step, direction, isAdvancing, coordinatesValid, refineryValid } = state;

  const headlinePrefill = useMemo(
    () =>
      getSocialHeadlinePrefill(
        session?.provider,
        session?.user?.name,
        selectedRole,
      ),
    [session?.provider, session?.user?.name, selectedRole],
  );

  useEffect(() => {
    const sessionStep = session?.user?.onboardingStep ?? 0;

    if (sessionStep >= 4 && step !== WIZARD_STEP.CALIBRATION) {
      router.replace("/dashboard");
      return;
    }

    dispatch({
      type: "SYNC_FROM_SESSION",
      step: sessionToWizardStep(sessionStep, Boolean(refineryDraft)),
    });
  }, [session?.user?.onboardingStep, refineryDraft, router, step]);

  const canContinue = useMemo(() => {
    switch (step) {
      case WIZARD_STEP.COORDINATES:
        return coordinatesValid;
      case WIZARD_STEP.FUEL:
        return (fuelProcessed || resumeSkipped) && !isFuelProcessing;
      case WIZARD_STEP.REFINERY:
        return refineryValid;
      case WIZARD_STEP.CALIBRATION:
        return false;
      default:
        return false;
    }
  }, [
    step,
    coordinatesValid,
    fuelProcessed,
    resumeSkipped,
    isFuelProcessing,
    refineryValid,
  ]);

  const handleCoordinatesComplete = useCallback(() => {
    dispatch({
      type: "NAVIGATE",
      step: WIZARD_STEP.FUEL,
      direction: 1,
    });
  }, []);

  const handleFuelComplete = useCallback(() => {
    dispatch({
      type: "NAVIGATE",
      step: WIZARD_STEP.REFINERY,
      direction: 1,
    });
  }, []);

  const handleRefineryComplete = useCallback(() => {
    dispatch({
      type: "NAVIGATE",
      step: WIZARD_STEP.CALIBRATION,
      direction: 1,
    });
  }, []);

  const handleFuelSkip = useCallback(async () => {
    dispatch({ type: "SET_ADVANCING", value: true });

    try {
      setResumeSkipped(true);
      await updateUserOnboarding(3, {});
      await updateSession({ onboardingStep: 3 });
      dispatch({
        type: "NAVIGATE",
        step: WIZARD_STEP.REFINERY,
        direction: 1,
      });
    } finally {
      dispatch({ type: "SET_ADVANCING", value: false });
    }
  }, [setResumeSkipped, updateSession]);

  const handleBack = useCallback(async () => {
    if (step <= WIZARD_STEP.COORDINATES || isAdvancing || step === WIZARD_STEP.CALIBRATION) {
      return;
    }

    const previousStep = (step - 1) as WizardStep;
    const serverStep = Math.max(previousStep - 1, 1);
    dispatch({ type: "SET_ADVANCING", value: true });

    try {
      await updateUserOnboarding(serverStep, {});
      await updateSession({ onboardingStep: serverStep });
      dispatch({
        type: "NAVIGATE",
        step: previousStep,
        direction: -1,
      });
    } finally {
      dispatch({ type: "SET_ADVANCING", value: false });
    }
  }, [step, isAdvancing, updateSession]);

  const submitCoordinatesForm = useCallback(() => {
    const form = document.getElementById(COORDINATES_FORM_ID) as HTMLFormElement | null;
    form?.requestSubmit();
  }, []);

  const submitRefineryForm = useCallback(() => {
    const form = document.getElementById(REFINERY_FORM_ID) as HTMLFormElement | null;
    form?.requestSubmit();
  }, []);

  const handleNext = useCallback(async () => {
    if (!canContinue || isAdvancing || step === WIZARD_STEP.CALIBRATION) {
      return;
    }

    if (step === WIZARD_STEP.COORDINATES) {
      submitCoordinatesForm();
      return;
    }

    if (step === WIZARD_STEP.FUEL && resumeSkipped) {
      await handleFuelSkip();
      return;
    }

    if (step === WIZARD_STEP.REFINERY) {
      submitRefineryForm();
    }
  }, [
    canContinue,
    handleFuelSkip,
    isAdvancing,
    resumeSkipped,
    step,
    submitCoordinatesForm,
    submitRefineryForm,
  ]);

  const renderStep = () => {
    switch (step) {
      case WIZARD_STEP.COORDINATES:
        return (
          <StepCoordinates
            formId={COORDINATES_FORM_ID}
            hideSubmitButton
            persistStepNumber={1}
            initialTargetTitle={headlinePrefill}
            onValidityChange={(valid) =>
              dispatch({ type: "SET_COORDINATES_VALID", valid })
            }
            onNext={handleCoordinatesComplete}
          />
        );
      case WIZARD_STEP.FUEL:
        return (
          <StepFuel
            onComplete={handleFuelComplete}
            onSkip={() => void handleFuelSkip()}
            onProcessingChange={setIsFuelProcessing}
          />
        );
      case WIZARD_STEP.REFINERY:
        return (
          <StepRefinery
            formId={REFINERY_FORM_ID}
            hideSubmitButton
            onValidityChange={(valid) =>
              dispatch({ type: "SET_REFINERY_VALID", valid })
            }
            onNext={handleRefineryComplete}
          />
        );
      case WIZARD_STEP.CALIBRATION:
        return <StepCalibration />;
      default:
        return null;
    }
  };

  const showFooterNav =
    step < WIZARD_STEP.CALIBRATION && step !== WIZARD_STEP.FUEL;

  const isWideStep = step === WIZARD_STEP.REFINERY;

  if (status === "loading") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            aria-hidden="true"
            className="h-10 w-10 rounded-full border-2 border-[oklch(0.62_0.21_265_/_0.3)] border-t-[oklch(0.62_0.21_265)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
          <p className="font-body text-sm text-muted-foreground">
            Loading your setup…
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:py-10">
      <div
        className={cn(
          "w-full overflow-hidden rounded-3xl border border-white/10 bg-surface/60 shadow-elevated backdrop-blur-2xl",
          step === WIZARD_STEP.CALIBRATION && "max-w-[580px]",
          !isWideStep && step !== WIZARD_STEP.CALIBRATION && "max-w-[540px]",
          isWideStep && "max-w-[1120px]",
        )}
      >
        {step < WIZARD_STEP.CALIBRATION && (
          <div className="px-6 pt-6 sm:px-8 sm:pt-8">
            <WizardProgressBar step={step} />
            <p className="mt-3 font-body text-xs font-medium tracking-wide text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>
        )}

        <div
          className={cn(
            "px-6 py-6 sm:px-8",
            step === WIZARD_STEP.CALIBRATION && "min-h-[480px]",
            step === WIZARD_STEP.REFINERY && "min-h-[600px]",
            step !== WIZARD_STEP.CALIBRATION &&
              step !== WIZARD_STEP.REFINERY &&
              "min-h-[420px]",
          )}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepMotion}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={stepTransition}
              className="flex flex-col"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {showFooterNav && (
          <div className="flex items-center justify-between gap-4 border-t border-white/10 px-6 py-5 sm:px-8 sm:py-6">
            <WizardNavButton
              variant="back"
              onClick={() => void handleBack()}
              disabled={step <= WIZARD_STEP.COORDINATES || isAdvancing}
              className={cn(step <= WIZARD_STEP.COORDINATES && "invisible")}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </WizardNavButton>

            <WizardNavButton
              variant="next"
              onClick={() => void handleNext()}
              disabled={!canContinue || isAdvancing}
            >
              {isAdvancing ? "Saving…" : "Continue"}
              {!isAdvancing && (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
            </WizardNavButton>
          </div>
        )}
      </div>
    </div>
  );
}
