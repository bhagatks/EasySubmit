/**
 * ATS-safe resume body fonts — see EASYSUBMIT_RESUME_RULES.md §1 (single family, no script/decorative).
 * Preview + future docx export should stay on this list.
 */

export type ResumeFontId = "arial" | "calibri" | "helvetica" | "times-new-roman";

export const DEFAULT_RESUME_FONT_ID: ResumeFontId = "calibri";

export const RESUME_FONT_STORAGE_KEY = "easysubmit-resume-font-v1";

export type ResumeFontSpec = {
  id: ResumeFontId;
  label: string;
  /** CSS font-family stack for preview rendering. */
  stack: string;
  /** Short note for UI / export. */
  note?: string;
};

/** Canonical list from product rules + Times New Roman (widely ATS-safe, common on exports). */
export const RESUME_FONTS: ResumeFontSpec[] = [
  {
    id: "calibri",
    label: "Calibri",
    stack: "Calibri, 'Segoe UI', Arial, sans-serif",
    note: "Default — modern Word standard",
  },
  {
    id: "arial",
    label: "Arial",
    stack: "Arial, Helvetica, sans-serif",
    note: "Most cited ATS-safe sans-serif",
  },
  {
    id: "helvetica",
    label: "Helvetica",
    stack: "Helvetica, Arial, sans-serif",
    note: "Mac / design standard sans-serif",
  },
  {
    id: "times-new-roman",
    label: "Times New Roman",
    stack: "'Times New Roman', Times, serif",
    note: "Classic serif — ATS-safe when kept simple",
  },
];

export function getResumeFontSpec(id: ResumeFontId): ResumeFontSpec {
  return RESUME_FONTS.find((font) => font.id === id) ?? RESUME_FONTS[0];
}

export function getResumeFontStack(id: ResumeFontId): string {
  return getResumeFontSpec(id).stack;
}

export function readStoredResumeFontId(): ResumeFontId {
  if (typeof window === "undefined") return DEFAULT_RESUME_FONT_ID;
  const raw = window.localStorage.getItem(RESUME_FONT_STORAGE_KEY);
  if (raw && RESUME_FONTS.some((font) => font.id === raw)) {
    return raw as ResumeFontId;
  }
  return DEFAULT_RESUME_FONT_ID;
}

export function writeStoredResumeFontId(id: ResumeFontId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RESUME_FONT_STORAGE_KEY, id);
}
