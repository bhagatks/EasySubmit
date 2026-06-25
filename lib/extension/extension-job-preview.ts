import { buildDeterministicCoverLetterMarkdown } from "@/lib/job-tracker/build-deterministic-cover-letter";
import { buildCoverLetterContext, buildCoverLetterHtml } from "@/lib/job-tracker/cover-letter";
import { buildResumePreviewHtml } from "@/lib/job-tracker/export/resume-preview-html";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import {
  getJobResumeTailorForEntry,
  getMergedResumeForJob,
  type JobResumeTailorRecord,
} from "@/lib/profile/job-resume-tailor";
import { prisma } from "@/lib/prisma";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

export type ExtensionJobPreviewKind = "resume" | "cover";

export type ExtensionJobPreviewResult =
  | { success: true; previewHtml: string }
  | { success: false; error: string; status: number };

async function loadJobForUser(userId: string, jobId: string) {
  return prisma.jobTrackerEntry.findFirst({
    where: { id: jobId, userId },
    select: {
      id: true,
      title: true,
      company: true,
      description: true,
    },
  });
}

function shouldUseStoredCoverLetter(
  tailor: JobResumeTailorRecord | null,
  deterministicBody: string,
): boolean {
  const stored = tailor?.coverLetter?.trim();
  if (!stored) return false;
  return stored !== deterministicBody.trim();
}

function emptyCoverPreviewHtml(): string {
  return `<div style="font-family:system-ui,sans-serif;padding:16px;color:#6B7280;font-size:13px;line-height:1.5;">
    <p style="margin:0;font-weight:600;color:#1F2937;">No cover letter yet</p>
    <p style="margin:8px 0 0;">Open in the dashboard to customize this letter.</p>
  </div>`;
}

export async function buildExtensionJobPreviewHtml(
  userId: string,
  jobId: string,
  kind: ExtensionJobPreviewKind,
): Promise<ExtensionJobPreviewResult> {
  const job = await loadJobForUser(userId, jobId);
  if (!job) {
    return { success: false, error: "Job not found.", status: 404 };
  }

  if (kind === "resume") {
    const merged = await getMergedResumeForJob(userId, jobId);
    if (!merged.success) {
      return { success: false, error: merged.error, status: 422 };
    }
    return {
      success: true,
      previewHtml: buildResumePreviewHtml(merged.form, merged.targetTitle),
    };
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

  if (!coverBody.trim()) {
    return { success: true, previewHtml: emptyCoverPreviewHtml() };
  }

  const ctx = buildCoverLetterContext({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    company: job.company,
    jobTitle: job.title,
    body: coverBody,
  });

  return {
    success: true,
    previewHtml: buildCoverLetterHtml(ctx),
  };
}
