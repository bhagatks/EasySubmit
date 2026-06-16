"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import OnboardingLayout from "@/components/layout/OnboardingLayout";
import Step1Timeline from "@/components/onboarding/Step1Timeline";
import Step3Locations from "@/components/onboarding/Step3Locations";
import Step4ResumeUpload from "@/components/onboarding/Step4ResumeUpload";
import Step7Experience from "@/components/onboarding/Step7Experience";
import Step8Roles from "@/components/onboarding/Step8Roles";
import Step9Salary from "@/components/onboarding/Step9Salary";
import Step10Matches from "@/components/onboarding/Step10Matches";
import Step11Survey from "@/components/onboarding/Step11Survey";
import Step12SocialProof from "@/components/onboarding/Step12SocialProof";
import {
  ONBOARDING_STEP,
  useOnboardingStore,
} from "@/stores/onboardingStore";

const PROGRESS_BY_STEP = [8, 25, 33, 42, 50, 58, 67, 75, 83, 92, 100];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
  }),
};

export default function OnboardingWizard() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const isMapping = useOnboardingStore((s) => s.isMapping);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const [direction, setDirection] = useState(1);

  const stepIndex = currentStep - 1;

  useEffect(() => {
    if (
      currentStep === ONBOARDING_STEP.PARSING ||
      currentStep === ONBOARDING_STEP.ANALYSIS_COMPLETE
    ) {
      nextStep();
    }
  }, [currentStep, nextStep]);

  const goNext = () => {
    setDirection(1);
    nextStep();
  };

  const goBack = () => {
    setDirection(-1);
    prevStep();
  };

  const renderStep = () => {
    switch (currentStep) {
      case ONBOARDING_STEP.TIMELINE:
        return <Step1Timeline onNext={goNext} />;
      case ONBOARDING_STEP.LOCATIONS:
        return <Step3Locations onNext={goNext} />;
      case ONBOARDING_STEP.RESUME:
      case ONBOARDING_STEP.PARSING:
        return <Step4ResumeUpload />;
      case ONBOARDING_STEP.EXPERIENCE:
        return <Step7Experience onNext={goNext} />;
      case ONBOARDING_STEP.ROLES:
        return <Step8Roles onNext={goNext} />;
      case ONBOARDING_STEP.SALARY:
        return <Step9Salary onNext={goNext} />;
      case ONBOARDING_STEP.MATCHES:
        return <Step10Matches onNext={goNext} />;
      case ONBOARDING_STEP.SURVEY:
        return <Step11Survey onNext={goNext} />;
      case ONBOARDING_STEP.SOCIAL_PROOF:
        return <Step12SocialProof />;
      default:
        return null;
    }
  };

  const showBackButton =
    currentStep > ONBOARDING_STEP.TIMELINE && !isMapping;

  return (
    <OnboardingLayout
      currentStep={currentStep}
      progress={PROGRESS_BY_STEP[stepIndex] ?? 0}
    >
      {showBackButton && (
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="mb-6 flex h-10 w-10 items-center justify-center rounded-[12px] text-[#1F2937] transition-colors hover:bg-gray-200/60"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
      )}

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-1 flex-col"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </OnboardingLayout>
  );
}
