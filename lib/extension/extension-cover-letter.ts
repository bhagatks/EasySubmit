import { buildDeterministicCoverLetterMarkdown } from "@/lib/job-tracker/build-deterministic-cover-letter";
import { buildCoverLetterDocumentPatch } from "@/lib/job-tracker/persist-cover-letter";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import {
  getJobResumeTailorForEntry,
  getMergedResumeForJob,
  updateJobReviewDocuments,
  type JobResumeTailorRecord,
} from "@/lib/profile/job-resume-tailor";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { prisma } from "@/lib/prisma";

export type ExtensionCoverLetterResult =
  | { success: true; body: string }
  | { success: false; error: string; status: number };

export type ExtensionCoverLetterSaveResult =
  | { success: true }
  | { success: false; error: string; status: number };

function shouldUseStoredCoverLetter(
  tailor: JobResumeTailorRecord | null,
  deterministicBody: string,
): boolean {
  const stored = tailor?.coverLetter?.trim();
  if (!stored) return false;
  return stored !== deterministicBody.trim();
}

export async function getExtensionCoverLetterBody(
  userId: string,
  jobId: string,
): Promise<ExtensionCoverLetterResult> {
  const job = await prisma.jobTrackerEntry.findFirst({
    where: { id: jobId, userId },
    select: {
      id: true,
      title: true,
      company: true,
      description: true,
    },
  });
  if (!job) {
    return { success: false, error: "Job not found.", status: 404 };
  }

  const [merged, tailor, prefs] = await Promise.all([
    getMergedResumeForJob(userId, jobId),
    getJobResumeTailorForEntry(userId, jobId),
    getExtensionUserPrefs(userId),
  ]);

  const form = merged.success ? merged.form : emptyHubRefineryForm();
  const targetTitle = merged.success ? merged.targetTitle : job.title;

  const template = buildDeterministicCoverLetterMarkdown({
    form,
    targetTitle,
    company: job.company,
    jobTitle: job.title,
    jobDescription: job.description,
  });

  const deterministicBody = template.ok ? template.markdown : "";
  const coverBody =
    prefs.customizeResume && shouldUseStoredCoverLetter(tailor, deterministicBody)
      ? tailor!.coverLetter!.trim()
      : tailor?.coverLetter?.trim() || deterministicBody;

  return { success: true, body: coverBody };
}

export async function saveExtensionCoverLetter(
  userId: string,
  jobId: string,
  body: string,
): Promise<ExtensionCoverLetterSaveResult> {
  const job = await prisma.jobTrackerEntry.findFirst({
    where: { id: jobId, userId },
    select: {
      id: true,
      title: true,
      company: true,
    },
  });
  if (!job) {
    return { success: false, error: "Job not found.", status: 404 };
  }

  const merged = await getMergedResumeForJob(userId, jobId);
  const form = merged.success
    ? merged.form
    : { firstName: "", lastName: "", email: "", phone: "" };

  const patch = buildCoverLetterDocumentPatch({
    form,
    company: job.company,
    jobTitle: job.title,
    body: body.trim(),
  });

  const updated = await updateJobReviewDocuments(userId, jobId, patch);
  if (!updated.success) {
    return { success: false, error: updated.error, status: 400 };
  }

  return { success: true };
}
