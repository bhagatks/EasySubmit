"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { OnboardingStepTransition } from "@/components/onboarding/OnboardingFlowShell";
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

export default function OnboardingWizard() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const isMapping = useOnboardingStore((s) => s.isMapping);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (
      currentStep === ONBOARDING_STEP.PARSING ||
      currentStep === ONBOARDING_STEP.ANALYSIS_COMPLETE
    ) {
      setDirection(1);
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
    <div className="flex min-h-full flex-col pt-8 lg:pt-10">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 lg:px-10">
        <div className="flex w-full max-w-[500px] flex-1 flex-col">
          <OnboardingStepTransition stepKey={currentStep} direction={direction}>
            {showBackButton && (
              <button
                type="button"
                onClick={goBack}
                aria-label="Go back"
                className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-white/10"
              >
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
            )}

            {renderStep()}
          </OnboardingStepTransition>
        </div>
      </div>
    </div>
  );
}
