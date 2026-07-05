import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { buildResumePreviewHtml } from "@/lib/job-tracker/export/resume-preview-html";
import type { JobTrackerTailoredResumePreview } from "@/lib/job-tracker/types";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import { normalizePageLengthPreference } from "@/lib/resume/page-length-preference";

export function buildTailoredResumePreview(
  form: HubRefineryForm,
  targetTitle: string,
  changedSections: StudioEditorSectionId[],
  updatedAt: Date | string,
  options?: {
    resumeRulesVersion?: 2;
  },
): JobTrackerTailoredResumePreview {
  const updated =
    typeof updatedAt === "string" ? updatedAt : updatedAt.toISOString();

  return {
    targetTitle,
    changedSections,
    updatedAt: updated,
    preview: refineryFormToPrimeResume(form, { targetRole: targetTitle }),
    previewHtml: buildResumePreviewHtml(form, targetTitle),
    skillsText: form.skillsText ?? "",
    pageLengthPreference: normalizePageLengthPreference(form.pageLengthPreference),
    resumeRulesVersion: options?.resumeRulesVersion,
  };
}
