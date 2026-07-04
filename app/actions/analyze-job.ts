"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  analyzeLatestJob,
  formatAnalysis,
  type LatestJobAnalysis,
} from "@/lib/job-tracker/analyze-latest-job";

export async function analyzeLatestJobAction(): Promise<{
  success: boolean;
  analysis: LatestJobAnalysis | null;
  formatted: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        analysis: null,
        formatted: "",
        error: "Not authenticated",
      };
    }

    const analysis = await analyzeLatestJob(session.user.id);
    if (!analysis) {
      return {
        success: false,
        analysis: null,
        formatted: "No jobs found for this user.",
        error: "No jobs found",
      };
    }

    return {
      success: true,
      analysis,
      formatted: formatAnalysis(analysis),
    };
  } catch (error) {
    return {
      success: false,
      analysis: null,
      formatted: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
