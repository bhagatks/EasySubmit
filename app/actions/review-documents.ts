"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import {
  buildCoverLetterContext,
  buildCoverLetterHtml,
} from "@/lib/job-tracker/cover-letter";
import { buildResumePreviewHtml } from "@/lib/job-tracker/export/resume-preview-html";
import { uint8ArrayToBase64 } from "@/lib/job-tracker/export/base64";
import { buildReviewExport } from "@/lib/job-tracker/export/review-export";
import {
  compileLatexPreview,
  generateCoverLatex,
  generateResumeLatex,
} from "@/lib/job-tracker/latex/review-latex";
import type { ReviewDocumentKind, ReviewExportFormat } from "@/lib/job-tracker/review-readiness";
import type { JobTrackerDetail } from "@/lib/job-tracker/types";
import {
  getMergedResumeForJob,
  getJobResumeTailorForEntry,
  getBaseResumeForJobExport,
  updateJobReviewDocuments,
} from "@/lib/profile/job-resume-tailor";
import { buildCoverLetterDocumentPatch } from "@/lib/job-tracker/persist-cover-letter";
import { prisma } from "@/lib/prisma";
import { resumeProfileDisplayLabel } from "@/lib/extension/resume-profiles";
import {
  enhanceJobCoverLetterForUser,
  enhanceJobResumeForUser,
  type EnhanceCoverActionResult,
  type EnhanceResumeActionResult,
} from "@/lib/job-tracker/enhance-review-documents";

export type { EnhanceCoverActionResult, EnhanceResumeActionResult };

export type ReviewActionResult =
  | { success: true }
  | { success: false; error: string; code?: string };

export type ReviewExportActionResult =
  | { success: true; filename: string; mimeType: string; base64: string }
  | { success: false; error: string; code?: string };

export type ReviewLatexPayloadResult =
  | {
      success: true;
      latex: string;
      savedLatex: string | null;
      previewHtml: string;
    }
  | { success: false; error: string; code?: string };

export type ReviewCompileLatexResult =
  | { success: true; previewHtml: string; validatedAt: string }
  | { success: false; errors: string[] };

async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

async function loadJobRow(userId: string, jobId: string) {
  return prisma.jobTrackerEntry.findFirst({
    where: { id: jobId.trim(), userId },
    select: {
      id: true,
      title: true,
      company: true,
      description: true,
      status: true,
      resumeTailor: {
        select: {
          id: true,
          coverLetter: true,
          resumeLatex: true,
          coverLetterLatex: true,
        },
      },
    },
  });
}

export async function saveJobCoverLetter(input: {
  jobId: string;
  coverLetter: string;
}): Promise<ReviewActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Sign in required", code: "unauthorized" };

  const job = await loadJobRow(userId, input.jobId);
  if (!job) return { success: false, error: "Job not found", code: "not_found" };

  const merged = await getMergedResumeForJob(userId, input.jobId);
  const form = merged.success
    ? merged.form
    : { firstName: "", lastName: "", email: "", phone: "" };

  const patch = buildCoverLetterDocumentPatch({
    form,
    company: job.company,
    jobTitle: job.title,
    body: input.coverLetter,
  });

  const updated = await updateJobReviewDocuments(userId, input.jobId, patch);
  if (!updated.success) return updated;

  revalidatePath("/dashboard/job-tracker");
  return { success: true };
}

export async function saveJobLatexSource(input: {
  jobId: string;
  kind: ReviewDocumentKind;
  latex: string;
}): Promise<ReviewActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Sign in required", code: "unauthorized" };

  const patch =
    input.kind === "resume"
      ? { resumeLatex: input.latex }
      : { coverLetterLatex: input.latex };

  const updated = await updateJobReviewDocuments(userId, input.jobId, patch);
  if (!updated.success) return updated;

  revalidatePath("/dashboard/job-tracker");
  return { success: true };
}

export async function enhanceJobResumeFromReview(jobId: string): Promise<EnhanceResumeActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Sign in required", code: "unauthorized" };

  const result = await enhanceJobResumeForUser(userId, jobId);
  if (result.success) revalidatePath("/dashboard/job-tracker");
  return result;
}

export async function enhanceJobCoverLetter(jobId: string): Promise<EnhanceCoverActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Sign in required", code: "unauthorized" };

  const result = await enhanceJobCoverLetterForUser(userId, jobId);
  if (result.success) revalidatePath("/dashboard/job-tracker");
  return result;
}

export async function exportReviewDocument(input: {
  jobId: string;
  kind: ReviewDocumentKind;
  format: ReviewExportFormat;
  profileSource?: "tailored" | "base";
}): Promise<ReviewExportActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Sign in required", code: "unauthorized" };

  const job = await loadJobRow(userId, input.jobId);
  if (!job) return { success: false, error: "Job not found", code: "not_found" };

  const profileSource = input.profileSource ?? "tailored";
  const merged =
    profileSource === "base"
      ? await getBaseResumeForJobExport(userId, input.jobId)
      : await getMergedResumeForJob(userId, input.jobId);
  const tailor = job.resumeTailor;

  if (input.kind === "resume") {
    if (!merged.success) {
      return { success: false, error: merged.error, code: "not_ready" };
    }
    const built = await buildReviewExport({
      kind: "resume",
      format: input.format,
      company: job.company,
      jobTitle: job.title,
      hasTailoredResume: Boolean(tailor),
      status: job.status,
      form: merged.form,
      targetTitle: merged.targetTitle,
    });
    if (!built.success) return built;
    return {
      success: true,
      filename: built.filename,
      mimeType: built.mimeType,
      base64: uint8ArrayToBase64(built.bytes),
    };
  }

  const coverBody = tailor?.coverLetter ?? null;
  const form = merged.success ? merged.form : { firstName: "", lastName: "", email: "", phone: "" };
  const coverContext = buildCoverLetterContext({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    company: job.company,
    jobTitle: job.title,
    body: coverBody,
  });

  const built = await buildReviewExport({
    kind: "cover",
    format: input.format,
    company: job.company,
    jobTitle: job.title,
    hasTailoredResume: Boolean(tailor),
    status: job.status,
    coverContext,
  });
  if (!built.success) return built;

  return {
    success: true,
    filename: built.filename,
    mimeType: built.mimeType,
    base64: uint8ArrayToBase64(built.bytes),
  };
}

export async function loadReviewLatexWorkspace(input: {
  jobId: string;
  kind: ReviewDocumentKind;
}): Promise<ReviewLatexPayloadResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Sign in required", code: "unauthorized" };

  const job = await loadJobRow(userId, input.jobId);
  if (!job) return { success: false, error: "Job not found", code: "not_found" };

  const merged = await getMergedResumeForJob(userId, input.jobId);
  const tailor = job.resumeTailor;

  if (input.kind === "resume") {
    if (!merged.success) {
      return { success: false, error: merged.error, code: "not_ready" };
    }
    const previewHtml = buildResumePreviewHtml(merged.form, merged.targetTitle);
    const latex =
      tailor?.resumeLatex?.trim() || generateResumeLatex(merged.form, merged.targetTitle);
    return {
      success: true,
      latex,
      savedLatex: tailor?.resumeLatex ?? null,
      previewHtml,
    };
  }

  const coverBody = tailor?.coverLetter ?? "";
  const form = merged.success
    ? merged.form
    : {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        cityState: "",
        linkedIn: "",
        professionalSummary: "",
        skillsText: "",
        experience: [],
        education: [],
        certifications: [],
        projects: [],
        languages: [],
        customSections: [],
      };

  const ctx = buildCoverLetterContext({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    company: job.company,
    jobTitle: job.title,
    body: coverBody,
  });

  const previewHtml = buildCoverLetterHtml(ctx);
  const latex = tailor?.coverLetterLatex?.trim() || generateCoverLatex(ctx);

  return {
    success: true,
    latex,
    savedLatex: tailor?.coverLetterLatex ?? null,
    previewHtml,
  };
}

export async function compileReviewLatex(input: {
  jobId: string;
  kind: ReviewDocumentKind;
  latex: string;
}): Promise<ReviewCompileLatexResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, errors: ["Sign in required"] };

  const payload = await loadReviewLatexWorkspace({ jobId: input.jobId, kind: input.kind });
  if (!payload.success) {
    return { success: false, errors: [payload.error] };
  }

  const compiled = compileLatexPreview({
    latex: input.latex,
    previewHtml: payload.previewHtml,
  });

  if (!compiled.success) {
    return { success: false, errors: compiled.errors };
  }

  return {
    success: true,
    previewHtml: compiled.previewHtml,
    validatedAt: compiled.validatedAt,
  };
}
