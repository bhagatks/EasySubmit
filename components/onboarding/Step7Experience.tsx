"use client";

import { motion } from "framer-motion";
import CheckIcon from "@/components/onboarding/CheckIcon";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";
import {
  useOnboardingStore,
  type ExperienceLevel,
} from "@/stores/onboardingStore";

const EXPERIENCE_OPTIONS: ExperienceLevel[] = [
  "Internship",
  "Entry Level",
  "Junior",
  "Mid-level",
  "Senior",
  "Expert",
];

interface Step7ExperienceProps {
  onNext: () => void;
}

export default function Step7Experience({ onNext }: Step7ExperienceProps) {
  const experienceLevels = useOnboardingStore((s) => s.experienceLevels);
  const toggleExperienceLevel = useOnboardingStore(
    (s) => s.toggleExperienceLevel
  );

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-2 text-2xl font-semibold leading-snug text-[#1F2937]">
        How much experience do you have?
      </h1>
      <p className="mb-6 text-sm text-gray-500">Select up to 2</p>

      <ul className="flex flex-col gap-3">
        {EXPERIENCE_OPTIONS.map((option, index) => {
          const isSelected = experienceLevels.includes(option);

          return (
            <motion.li
              key={option}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
            >
              <button
                type="button"
                onClick={() => toggleExperienceLevel(option)}
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

      <OnboardingNextButton
        disabled={experienceLevels.length === 0}
        onClick={onNext}
      />
    </div>
  );
}
