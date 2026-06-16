"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useRouter } from "next/navigation";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";

export default function Step12SocialProof() {
  const router = useRouter();

  const goToSignup = () => {
    router.push("/auth/signup");
  };

  return (
    <div className="flex flex-1 flex-col justify-center">
      <h1 className="mb-8 text-2xl font-semibold leading-snug text-[#1F2937]">
        Why recruiters recommend EasySubmit
      </h1>

      <motion.blockquote
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-[12px] bg-white p-6 shadow-sm"
      >
        <Quote size={32} strokeWidth={1.5} className="mb-4 text-[#12B3D1]/30" />

        <p className="text-lg font-medium leading-relaxed text-[#1F2937]">
          EasySubmit helps candidates craft high-quality, unique applications
          that stand out to hiring teams.
        </p>

        <footer className="mt-6 border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-[#1F2937]">
            Technical Recruiter
          </p>
          <p className="text-sm text-gray-500">Enterprise technology sector</p>
        </footer>
      </motion.blockquote>

      <OnboardingNextButton onClick={goToSignup} />
    </div>
  );
}
