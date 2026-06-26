import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildDeterministicCoverLetterMarkdown } from "@/lib/job-tracker/build-deterministic-cover-letter";
import { buildCoverLetterHtml, buildCoverLetterPlainText, buildCoverLetterContext } from "@/lib/job-tracker/cover-letter";
import { reviewExportFilename } from "@/lib/job-tracker/export/export-filename";
import { buildResumeDocx } from "@/lib/job-tracker/export/resume-docx";
import { buildResumePdf } from "@/lib/job-tracker/export/resume-pdf";
import { buildTextPdfFromString } from "@/lib/job-tracker/export/simple-pdf";
import { buildWordBlobFromHtml } from "@/lib/job-tracker/export/word-html";
import { getExtensionUserPrefs } from "@/lib/extension/user-prefs";
import {
  getJobResumeTailorForEntry,
  getMergedResumeForJob,
  type JobResumeTailorRecord,
} from "@/lib/profile/job-resume-tailor";
import { findDefaultProfile } from "@/lib/profile/resume-profile-core";
import { hubRefineryFormFromProfile, targetTitleFromProfile } from "@/lib/profile/studio-form-db";
import { prisma } from "@/lib/prisma";

export type ExtensionJobPdfResult =
  | { success: true; bytes: Uint8Array; filename: string }
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

async function resolveDefaultResumeForm(userId: string): Promise<
  | { success: true; form: HubRefineryForm; targetTitle: string }
  | { success: false; error: string; status: number }
> {
  const profile = await findDefaultProfile(userId);
  if (!profile) {
    return { success: false, error: "No resume profile found.", status: 404 };
  }

  return {
    success: true,
    form: hubRefineryFormFromProfile(profile),
    targetTitle: targetTitleFromProfile(profile),
  };
}

async function resolveResumeFormForJob(
  userId: string,
  jobId: string,
  customizeResume: boolean,
): Promise<
  | { success: true; form: HubRefineryForm; targetTitle: string }
  | { success: false; error: string; status: number }
> {
  if (customizeResume) {
    const merged = await getMergedResumeForJob(userId, jobId);
    if (merged.success) {
      return {
        success: true,
        form: merged.form,
        targetTitle: merged.targetTitle,
      };
    }
    return { success: false, error: merged.error, status: 422 };
  }

  return resolveDefaultResumeForm(userId);
}

function shouldUseStoredCoverLetter(
  tailor: JobResumeTailorRecord | null,
  deterministicBody: string,
): boolean {
  const stored = tailor?.coverLetter?.trim();
  if (!stored) return false;
  return stored !== deterministicBody.trim();
}

export async function buildExtensionResumePdf(
  userId: string,
  jobId: string,
): Promise<ExtensionJobPdfResult> {
  const [job, prefs] = await Promise.all([
    loadJobForUser(userId, jobId),
    getExtensionUserPrefs(userId),
  ]);

  if (!job) {
    return { success: false, error: "Job not found.", status: 404 };
  }

  const resume = await resolveResumeFormForJob(userId, jobId, prefs.customizeResume);
  if (!resume.success) {
    return resume;
  }

  const bytes = await buildResumePdf(resume.form, resume.targetTitle);
  const filename = reviewExportFilename({
    firstName: resume.form.firstName,
    company: job.company,
    jobTitle: job.title,
    kind: "resume",
    format: "pdf",
  });

  return { success: true, bytes, filename };
}

export async function buildExtensionCoverLetterPdf(
  userId: string,
  jobId: string,
): Promise<ExtensionJobPdfResult> {
  const [job, prefs, tailor] = await Promise.all([
    loadJobForUser(userId, jobId),
    getExtensionUserPrefs(userId),
    getJobResumeTailorForEntry(userId, jobId),
  ]);

  if (!job) {
    return { success: false, error: "Job not found.", status: 404 };
  }

  const resume = await resolveResumeFormForJob(userId, jobId, prefs.customizeResume);
  if (!resume.success) {
    return resume;
  }

  const template = buildDeterministicCoverLetterMarkdown({
    form: resume.form,
    targetTitle: resume.targetTitle,
    company: job.company,
    jobTitle: job.title,
    jobDescription: job.description,
  });

  if (!template.ok) {
    return { success: false, error: template.error, status: 422 };
  }

  const body =
    prefs.customizeResume && shouldUseStoredCoverLetter(tailor, template.markdown)
      ? tailor!.coverLetter!.trim()
      : template.markdown;

  const coverContext = buildCoverLetterContext({
    firstName: resume.form.firstName,
    lastName: resume.form.lastName,
    email: resume.form.email,
    phone: resume.form.phone,
    company: job.company,
    jobTitle: job.title,
    body,
  });

  const plain = buildCoverLetterPlainText(coverContext);
  const bytes = buildTextPdfFromString(plain, `Cover — ${job.title}`);
  const filename = reviewExportFilename({
    firstName: resume.form.firstName,
    company: job.company,
    jobTitle: job.title,
    kind: "cover",
    format: "pdf",
  });

  return { success: true, bytes, filename };
}

export async function buildExtensionResumeDocx(
  userId: string,
  jobId: string,
): Promise<ExtensionJobPdfResult> {
  const [job, prefs] = await Promise.all([
    loadJobForUser(userId, jobId),
    getExtensionUserPrefs(userId),
  ]);

  if (!job) {
    return { success: false, error: "Job not found.", status: 404 };
  }

  const resume = await resolveResumeFormForJob(userId, jobId, prefs.customizeResume);
  if (!resume.success) {
    return resume;
  }

  const bytes = await buildResumeDocx(resume.form, resume.targetTitle);
  const filename = reviewExportFilename({
    firstName: resume.form.firstName,
    company: job.company,
    jobTitle: job.title,
    kind: "resume",
    format: "word",
  });

  return { success: true, bytes, filename };
}

export async function buildExtensionCoverLetterDocx(
  userId: string,
  jobId: string,
): Promise<ExtensionJobPdfResult> {
  const [job, prefs, tailor] = await Promise.all([
    loadJobForUser(userId, jobId),
    getExtensionUserPrefs(userId),
    getJobResumeTailorForEntry(userId, jobId),
  ]);

  if (!job) {
    return { success: false, error: "Job not found.", status: 404 };
  }

  const resume = await resolveResumeFormForJob(userId, jobId, prefs.customizeResume);
  if (!resume.success) {
    return resume;
  }

  const template = buildDeterministicCoverLetterMarkdown({
    form: resume.form,
    targetTitle: resume.targetTitle,
    company: job.company,
    jobTitle: job.title,
    jobDescription: job.description,
  });

  if (!template.ok) {
    return { success: false, error: template.error, status: 422 };
  }

  const body =
    prefs.customizeResume && shouldUseStoredCoverLetter(tailor, template.markdown)
      ? tailor!.coverLetter!.trim()
      : template.markdown;

  const coverContext = buildCoverLetterContext({
    firstName: resume.form.firstName,
    lastName: resume.form.lastName,
    email: resume.form.email,
    phone: resume.form.phone,
    company: job.company,
    jobTitle: job.title,
    body,
  });

  const html = buildCoverLetterHtml(coverContext, { includeToolbarSpacer: false });
  const bodyHtml =
    html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1]?.trim() ??
    `<pre>${buildCoverLetterPlainText(coverContext)}</pre>`;
  const bytes = buildWordBlobFromHtml(`Cover — ${job.title}`, bodyHtml);
  const filename = reviewExportFilename({
    firstName: resume.form.firstName,
    company: job.company,
    jobTitle: job.title,
    kind: "cover",
    format: "word",
  });

  return { success: true, bytes, filename };
}
