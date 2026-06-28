import type { CardPresentation } from "@shared/extension/card-presentation";

export type ExtensionTabStatus =
  | "restricted"
  | "no_job"
  | "loading"
  | "manual"
  | "detected"
  | "card_hidden";

export type ExtensionTabStatusPayload = {
  status: ExtensionTabStatus;
  title?: string;
  company?: string | null;
  saved?: boolean;
  jobStatus?: string;
  cardVisible?: boolean;
  message?: string;
};

export function presentationToTabStatus(
  presentation: CardPresentation,
  options?: { cardVisible?: boolean; saved?: boolean; jobStatus?: string },
): ExtensionTabStatusPayload {
  const cardVisible = options?.cardVisible ?? true;

  switch (presentation) {
    case "manual_capture":
      return { status: "manual", cardVisible, saved: options?.saved, jobStatus: options?.jobStatus };
    case "loading":
      return { status: "loading", cardVisible, saved: options?.saved, jobStatus: options?.jobStatus };
    case "no_job":
      return { status: "no_job", cardVisible, saved: options?.saved, jobStatus: options?.jobStatus };
    case "job":
      return {
        status: "detected",
        cardVisible,
        saved: options?.saved,
        jobStatus: options?.jobStatus,
      };
    default:
      return { status: "card_hidden", cardVisible: false };
  }
}

export function tabStatusLabel(payload: ExtensionTabStatusPayload): string {
  switch (payload.status) {
    case "restricted":
      return payload.message ?? "This page cannot use the job card.";
    case "no_job":
      return "Job not detected on this page.";
    case "loading":
      return "Reading job details…";
    case "manual":
      return "Add job details manually.";
    case "detected":
      if (payload.title?.trim()) {
        const company = payload.company?.trim();
        return company ? `${payload.title} · ${company}` : payload.title;
      }
      return "Job detected on this page.";
    case "card_hidden":
      return "Job card is not open on this page.";
    default:
      return "";
  }
}
