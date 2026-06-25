import type { ScrapedJobMetadata } from "./types";

export type CardPresentation = "job" | "no_job" | "manual_capture" | "loading";

export const NO_JOB_DETECTED_TITLE = "Job not detected";

export const NO_JOB_DETECTED_MESSAGE =
  "Open a job posting page or use the extension menu to capture a role manually.";

export const MANUAL_CAPTURE_TITLE = "Add job details";

export const MANUAL_CAPTURE_MESSAGE =
  "We couldn't read this page automatically. Paste the job URL and description to continue.";

export const LOADING_JOB_MESSAGE = "Reading job details…";

export function buildNoJobDetectedMetadata(): ScrapedJobMetadata {
  return {
    title: NO_JOB_DETECTED_TITLE,
    company: null,
    location: null,
    salaryText: null,
    description: null,
    platform: "generic",
    confidence: 0,
  };
}

export function buildManualCaptureMetadata(): ScrapedJobMetadata {
  return {
    title: MANUAL_CAPTURE_TITLE,
    company: null,
    location: null,
    salaryText: null,
    description: null,
    platform: "generic",
    confidence: 0,
  };
}

export function buildLoadingJobMetadata(): ScrapedJobMetadata {
  return {
    title: "Reading job details…",
    company: null,
    location: null,
    salaryText: null,
    description: null,
    platform: "generic",
    confidence: 0,
  };
}
