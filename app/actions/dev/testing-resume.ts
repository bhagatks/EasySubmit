"use server";

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enhanceResumeForUserId } from "@/lib/ai/enhance-resume-for-user";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { EnhanceResumeProfileResult } from "@/lib/ai/enhance-resume-for-user";

function devOnly() {
  if (process.env.NODE_ENV !== "development") notFound();
}

export type TestEnhanceMode = "deterministic" | "ai_system" | "user_default";

export type TestRunEnhanceInput = {
  form: HubRefineryForm;
  targetRole: string;
  jobDescription: string;
  mode?: TestEnhanceMode;
};

function modeToEnhanceOpts(mode: TestEnhanceMode = "user_default") {
  switch (mode) {
    case "deterministic":
      return { allowAiUpgrade: false as const };
    case "ai_system":
      return {
        allowAiUpgrade: true as const,
        forceAiEnabled: true as const,
        forceSystem: true as const,
        useCustomerKey: false as const,
      };
    default:
      return {};
  }
}

export async function testRunEnhance(
  input: TestRunEnhanceInput,
): Promise<EnhanceResumeProfileResult> {
  devOnly();

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "Sign in required", code: "unauthorized" };
  }

  return enhanceResumeForUserId(userId, {
    form: input.form,
    targetRole: input.targetRole,
    jobDescription: input.jobDescription,
    variant: "dashboard",
    ...modeToEnhanceOpts(input.mode),
  });
}
