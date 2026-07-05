import type { PageLengthPreference } from "@/lib/resume/page-length-preference";
import type { ResumePageModeV2 } from "@/lib/resume/v2/page-mode";
import { RESUME_PAGE_MODE_V2_OPTIONS } from "@/lib/resume/v2/page-mode";

/** v1 auto/1/2 plus v2 page modes stored on the same form field. */
export type ResumeLengthSelectValue = PageLengthPreference | ResumePageModeV2;

export const RESUME_LENGTH_V1_OPTIONS: ReadonlyArray<{
  id: PageLengthPreference;
  label: string;
}> = [
  { id: "auto", label: "Auto (recommended)" },
  { id: "1", label: "1 page" },
  { id: "2", label: "2 pages" },
];

export function resumeLengthOptionsForRules(
  rulesV2Enabled: boolean,
): ReadonlyArray<{ id: ResumeLengthSelectValue; label: string; description?: string }> {
  if (!rulesV2Enabled) {
    return RESUME_LENGTH_V1_OPTIONS;
  }
  return RESUME_PAGE_MODE_V2_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    description: option.description,
  }));
}

export function isV2PageModeValue(value: ResumeLengthSelectValue): value is ResumePageModeV2 {
  return value === "1" || value === "2" || value === "3" || value === "4+";
}
