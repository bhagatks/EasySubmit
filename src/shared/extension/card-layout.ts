import type { ScrapedJobMetadata } from "@/src/shared/extension/types";
import type { JourneyStage } from "@/src/shared/journey-display";

export type ExtensionCardView = "summary" | "job-detail" | "resume-preview" | "cover-preview";

export type JobDetailField = {
  label: string;
  value: string;
};

export function shouldShowSavedMetaRow(saved: boolean): boolean {
  return saved;
}

export function shouldShowReviewRow(input: {
  saved: boolean;
  status?: string | null;
  stage: JourneyStage;
}): boolean {
  if (!input.saved || input.stage === "error") return false;
  return (
    input.status === "RESUME_READY" ||
    input.status === "READY_TO_APPLY" ||
    input.status === "APPLIED"
  );
}

function platformLabel(platform: string): string {
  if (!platform || platform === "generic") return "Web";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function buildJobDetailFields(
  metadata: Pick<
    ScrapedJobMetadata,
    "company" | "location" | "salaryText" | "description" | "platform" | "jsonLdFields"
  >,
): { fields: JobDetailField[]; description: string | null } {
  const fields: JobDetailField[] = [];

  if (metadata.company?.trim()) {
    fields.push({ label: "Company", value: metadata.company.trim() });
  }
  if (metadata.location?.trim()) {
    fields.push({ label: "Location", value: metadata.location.trim() });
  }
  if (metadata.salaryText?.trim()) {
    fields.push({ label: "Salary", value: metadata.salaryText.trim() });
  }
  fields.push({ label: "Platform", value: platformLabel(metadata.platform) });

  const jsonLd = metadata.jsonLdFields;
  if (jsonLd?.qualifications?.trim()) {
    fields.push({ label: "Qualifications", value: jsonLd.qualifications.trim() });
  }
  if (jsonLd?.responsibilities?.trim()) {
    fields.push({ label: "Responsibilities", value: jsonLd.responsibilities.trim() });
  }
  if (jsonLd?.incentives?.trim()) {
    fields.push({ label: "Benefits", value: jsonLd.incentives.trim() });
  }

  const description = metadata.description?.trim() || null;
  return { fields, description };
}

export function dashboardPanelForCardView(view: ExtensionCardView): string | null {
  switch (view) {
    case "job-detail":
      return "job";
    case "resume-preview":
      return "resume";
    case "cover-preview":
      return "cover";
    default:
      return null;
  }
}

export function previewViewTitle(view: ExtensionCardView): string | null {
  switch (view) {
    case "job-detail":
      return "Job details";
    case "resume-preview":
      return "Resume";
    case "cover-preview":
      return "Cover letter";
    default:
      return null;
  }
}
