"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useRouter } from "next/navigation";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";
import {
  buildOnboardingPayload,
  isOnboardingComplete,
} from "@/lib/onboarding/payload";
import { useOnboardingStore } from "@/stores/onboardingStore";

export default function Step12SocialProof() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onboardingState = useOnboardingStore();

  const handleFinalize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = buildOnboardingPayload({
        jobTimeline: onboardingState.jobTimeline,
        targetLocations: onboardingState.targetLocations,
        experienceLevels: onboardingState.experienceLevels,
        selectedRole: onboardingState.selectedRole,
        minSalary: onboardingState.minSalary,
        referralSource: onboardingState.referralSource,
        resumeFile: onboardingState.resumeFile,
        resumeFileName: onboardingState.resumeFileName,
      });

      if (!isOnboardingComplete(payload)) {
        throw new Error("Please complete all onboarding steps before finalizing.");
      }

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (onboardingState.resumeFile) {
        formData.append("resume", onboardingState.resumeFile);
      }

      const response = await fetch("/api/profile/finalize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save profile");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [onboardingState, router]);

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
          EasySubmit helps candidates craft high-quality, unique applications that stand out to
          hiring teams.
        </p>

        <footer className="mt-6 border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-[#1F2937]">Technical Recruiter</p>
          <p className="text-sm text-gray-500">Enterprise technology sector</p>
        </footer>
      </motion.blockquote>

      {error && (
        <p className="mt-6 rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <OnboardingNextButton
        onClick={handleFinalize}
        disabled={loading}
        label={loading ? "Saving profile..." : "Finalize Profile"}
      />
    </div>
  );
}
