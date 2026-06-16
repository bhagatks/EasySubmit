"use client";

import { motion } from "framer-motion";
import CheckIcon from "@/components/onboarding/CheckIcon";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";
import { useOnboardingStore } from "@/stores/onboardingStore";

const SURVEY_OPTIONS = [
  "LinkedIn",
  "Google",
  "TikTok",
  "YouTube",
  "Instagram",
  "Friend or Colleague",
  "Twitter / X",
  "Podcast",
  "Other",
] as const;

interface Step11SurveyProps {
  onNext: () => void;
}

export default function Step11Survey({ onNext }: Step11SurveyProps) {
  const referralSource = useOnboardingStore((s) => s.referralSource);
  const setReferralSource = useOnboardingStore((s) => s.setReferralSource);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-8 text-2xl font-semibold leading-snug text-[#1F2937]">
        How did you hear about EasySubmit?
      </h1>

      <ul className="flex flex-col gap-3">
        {SURVEY_OPTIONS.map((option, index) => {
          const isSelected = referralSource === option;

          return (
            <motion.li
              key={option}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <button
                type="button"
                onClick={() => setReferralSource(option)}
                aria-pressed={isSelected}
                className={[
                  "flex w-full items-center justify-between rounded-[12px] bg-white px-5 py-4 text-left text-base font-medium text-[#1F2937] shadow-sm transition-colors",
                  isSelected
                    ? "border-2 border-[#12B3D1]"
                    : "border-2 border-transparent hover:border-gray-200",
                ].join(" ")}
              >
                <span>{option}</span>
                {isSelected && <CheckIcon />}
              </button>
            </motion.li>
          );
        })}
      </ul>

      <OnboardingNextButton disabled={!referralSource} onClick={onNext} />
    </div>
  );
}
