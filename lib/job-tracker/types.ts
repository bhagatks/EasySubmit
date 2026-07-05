import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import type { PipelineStepFailure } from "@/lib/job-tracker/pipeline-tracker-view";

export type { JobTrackerStatus };

export { JOB_TRACKER_PIPELINE_STATUSES as ACTIVE_JOB_TRACKER_STATUSES } from "@/lib/job-tracker/pipeline";

/** Dashboard / overview row derived from `JobTrackerEntry`. */
export type JobTrackerSummary = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  status: JobTrackerStatus;
  platform: string | null;
  canonicalUrl: string;
  savedAt: string;
  appliedAt: string | null;
  /** From metadata.appliedSource — distinguishes manual vs assist apply. */
  appliedSource?: string | null;
  /** Precomputed on list — hover tooltip when non-null */
  issueMessage?: string | null;
  hasTailoredResume?: boolean;
  /** First failed capture/resume pipeline step — blocks stage advance on tracker. */
  pipelineStepFailure?: PipelineStepFailure | null;
};

/** Full job row for the review overlay — job-centric model (tailor/export fields live here). */
export type JobTrackerDetail = JobTrackerSummary & {
  description: string | null;
  notes: string | null;
  /** Cached JD brain output — drives keyword gap when present (post-tailor jobs). */
  jdIntelligence?: JDIntelligence | null;
  metadata: Record<string, unknown> | null;
  hasTailoredResume: boolean;
  sourceProfileId: string | null;
  /** Resolved from `sourceProfileId` when the profile still exists. */
  sourceProfileName?: string | null;
  updatedAt: string;
  /** Merged base profile + job overrides — populated when preview data is available. */
  tailoredResumePreview?: JobTrackerTailoredResumePreview | null;
  /** Cover + LaTeX fields from `job_resume_tailors`. */
  reviewDocuments?: JobReviewDocuments | null;
  reviewContact?: JobReviewContact | null;
  /** When merge/preview fails but tailor row exists. */
  previewError?: string | null;
};

export type JobReviewDocuments = {
  coverLetter: string | null;
  resumeLatex: string | null;
  coverLetterLatex: string | null;
  documentsUpdatedAt: string | null;
};

export type JobReviewContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type JobTrackerTailoredResumePreview = {
  targetTitle: string;
  changedSections: StudioEditorSectionId[];
  updatedAt: string;
  preview: PrimeResumeData;
  /** Self-contained HTML for iframe preview in Review Screen. */
  previewHtml: string;
  /** Category-style skills block for v2 readiness scoring. */
  skillsText?: string;
  pageLengthPreference?: string;
  resumeRulesVersion?: 2;
};
