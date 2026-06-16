"use client";

import { motion } from "framer-motion";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";
import {
  useOnboardingStore,
  type JobTimeline,
} from "@/stores/onboardingStore";

const CAREER_SITUATION_OPTIONS: {
  value: JobTimeline;
  title: string;
  description: string;
}[] = [
  {
    value: "In a Rush",
    title: "In a Rush",
    description:
      "I am actively displaced or need a new role immediately.",
  },
  {
    value: "Planning Ahead",
    title: "Planning Ahead",
    description:
      "I am ready for a change and want a smooth transition over the next few months.",
  },
  {
    value: "Just Exploring",
    title: "Just Exploring",
    description:
      "I have a job but want to see what else is out there without any pressure.",
  },
];

interface Step1TimelineProps {
  onNext: () => void;
}

export default function Step1Timeline({ onNext }: Step1TimelineProps) {
  const jobTimeline = useOnboardingStore((s) => s.jobTimeline);
  const setJobTimeline = useOnboardingStore((s) => s.setJobTimeline);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-8 text-2xl font-semibold leading-snug text-[#1F2937]">
        What best describes your current career situation?
      </h1>

      <ul className="flex flex-col gap-3">
        {CAREER_SITUATION_OPTIONS.map((option, index) => {
          const isSelected = jobTimeline === option.value;

          return (
            <motion.li
              key={option.value}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <button
                type="button"
                onClick={() => setJobTimeline(option.value)}
                aria-pressed={isSelected}
                className={[
                  "flex w-full flex-col gap-1 rounded-[12px] bg-white px-5 py-5 text-left shadow-sm transition-shadow",
                  isSelected
                    ? "border-2 border-[#12B3D1] shadow-[0_0_15px_rgba(18,179,209,0.15)]"
                    : "border-2 border-transparent hover:border-gray-200",
                ].join(" ")}
              >
                <span className="text-base font-semibold text-[#1F2937]">
                  {option.title}
                </span>
                <span className="text-sm leading-relaxed text-gray-500">
                  {option.description}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <OnboardingNextButton disabled={!jobTimeline} onClick={onNext} />
    </div>
  );
}
