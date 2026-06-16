"use client";

import { motion } from "framer-motion";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";

interface Step10MatchesProps {
  onNext: () => void;
}

export default function Step10Matches({ onNext }: Step10MatchesProps) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 text-2xl font-semibold text-[#1F2937]"
      >
        Great news — we found strong matches
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="mb-8 text-base leading-relaxed text-gray-600"
      >
        Based on your profile and preferences, there are roles ready for you to
        explore.
      </motion.p>

      <OnboardingNextButton onClick={onNext} />
    </div>
  );
}
