import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { getMergedResumeForJob } from "@/lib/profile/job-resume-tailor";
import { prisma } from "@/lib/prisma";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { analyzeKeywordGapFromIntelligence } from "@/lib/job-tracker/ats/keyword-gap";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";

const TOP_MISSING_MAX = 8;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const entry = await prisma.jobTrackerEntry.findFirst({
    where: { id: params.id, userId },
    select: { jdIntelligence: true, title: true },
  });

  if (!entry) {
    return Response.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const intel = entry.jdIntelligence as JDIntelligence | null;
  if (
    !intel ||
    (intel.tier1Keywords.length === 0 &&
      intel.tier2Keywords.length === 0 &&
      intel.tier3Keywords.length === 0)
  ) {
    return Response.json({ success: true, topMissing: [], coveragePercent: null });
  }

  const merged = await getMergedResumeForJob(userId, params.id);
  if (!merged.success) {
    return Response.json({ success: true, topMissing: [], coveragePercent: null });
  }

  const prime = refineryFormToPrimeResume(merged.form);
  const experienceBlob = (merged.form.experience ?? [])
    .map((e) => `${e.title ?? ""} ${e.company ?? ""} ${e.bullets ?? ""}`)
    .join("\n");
  const gap = analyzeKeywordGapFromIntelligence(prime, intel, merged.targetTitle, {
    experienceBlob,
  });

  return Response.json({
    success: true,
    topMissing: gap.topMissing.slice(0, TOP_MISSING_MAX),
    coveragePercent: gap.coveragePercent,
  });
}
