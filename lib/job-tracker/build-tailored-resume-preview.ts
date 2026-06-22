import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import type { JobTrackerTailoredResumePreview } from "@/lib/job-tracker/types";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";

export function buildTailoredResumePreview(
  form: HubRefineryForm,
  targetTitle: string,
  changedSections: StudioEditorSectionId[],
  updatedAt: Date | string,
): JobTrackerTailoredResumePreview {
  const updated =
    typeof updatedAt === "string" ? updatedAt : updatedAt.toISOString();

  return {
    targetTitle,
    changedSections,
    updatedAt: updated,
    preview: refineryFormToPrimeResume(form, { targetRole: targetTitle }),
  };
}
