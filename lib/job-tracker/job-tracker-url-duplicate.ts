import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { JOB_TRACKER_KANBAN_COLUMNS } from "@/lib/job-tracker/pipeline";
import { isApplyJobUrl } from "@/src/shared/extension/apply-gate";

export type JobTrackerUrlDuplicateSummary = {
  id: string;
  title: string;
  company: string | null;
  status: JobTrackerStatus;
  statusLabel: string;
  canonicalUrl: string;
};

export function jobTrackerStatusLabel(status: JobTrackerStatus): string {
  const column = JOB_TRACKER_KANBAN_COLUMNS.find((item) => item.status === status);
  if (column) return column.title;
  if (status === "ARCHIVED") return "Archived";
  if (status === "INTERVIEW") return "Interview";
  if (status === "OFFER") return "Offer";
  if (status === "REJECTED") return "Rejected";
  return status;
}

export function toJobTrackerUrlDuplicateSummary(entry: {
  id: string;
  title: string;
  company: string | null;
  status: JobTrackerStatus;
  canonicalUrl: string;
}): JobTrackerUrlDuplicateSummary {
  return {
    id: entry.id,
    title: entry.title,
    company: entry.company,
    status: entry.status,
    statusLabel: jobTrackerStatusLabel(entry.status),
    canonicalUrl: entry.canonicalUrl,
  };
}

export function formatJobTrackerDuplicateHeadline(existing: JobTrackerUrlDuplicateSummary): string {
  const role = existing.title.trim() || "This job";
  const company = existing.company?.trim();
  return company ? `${role} at ${company}` : role;
}

export function jobTrackerDuplicateBlockMessage(existing: JobTrackerUrlDuplicateSummary): string {
  return `This posting is already in your Job Tracker (${existing.statusLabel}). Archive or delete the existing entry before adding it again.`;
}

/** Only real posting URLs participate in duplicate detection. */
export function shouldCheckJobTrackerUrlDuplicate(rawUrl: string | null | undefined): boolean {
  return isApplyJobUrl(rawUrl);
}
