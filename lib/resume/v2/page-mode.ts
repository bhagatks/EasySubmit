/** Resume rules v2 — page mode selection (v1 export/enhance unchanged). */

export const RESUME_RULES_V2_VERSION = 2 as const;

export type ResumePageModeV2 = "1" | "2" | "3" | "4+";

export const DEFAULT_RESUME_PAGE_MODE_V2: ResumePageModeV2 = "2";

export const RESUME_PAGE_MODE_V2_OPTIONS: ReadonlyArray<{
  id: ResumePageModeV2;
  label: string;
  description: string;
}> = [
  {
    id: "1",
    label: "1 page",
    description: "Tight ATS budget — shorter summary, fewer skills, fewer bullets per role.",
  },
  {
    id: "2",
    label: "2 pages",
    description: "Default — conservative ATS-oriented content budget.",
  },
  {
    id: "3",
    label: "3 pages",
    description: "Extended career narrative — more summary, skills, and bullets than mode 2.",
  },
  {
    id: "4+",
    label: "4+ extended",
    description: "No content limits — prioritize keyword coverage; ATS parse risk warning shown.",
  },
];

export function normalizeResumePageModeV2(value: unknown): ResumePageModeV2 {
  if (value === "4" || value === "4+") return "4+";
  if (value === "1" || value === "2" || value === "3") return value;
  return DEFAULT_RESUME_PAGE_MODE_V2;
}

export function isResumePageModeV2Implemented(mode: ResumePageModeV2): boolean {
  return mode === "1" || mode === "2" || mode === "3" || mode === "4+";
}
