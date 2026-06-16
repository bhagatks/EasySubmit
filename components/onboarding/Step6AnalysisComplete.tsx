"use client";

import { motion } from "framer-motion";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";

interface Step6AnalysisCompleteProps {
  onNext: () => void;
}

export default function Step6AnalysisComplete({ onNext }: Step6AnalysisCompleteProps) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-3 text-2xl font-semibold text-[#1F2937]"
      >
        Resume analysis complete
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="mb-8 text-base leading-relaxed text-gray-600"
      >
        Confirm a few final details and we&apos;ll match you with roles that fit
        your background.
      </motion.p>

      <OnboardingNextButton onClick={onNext} />
    </div>
  );
}
