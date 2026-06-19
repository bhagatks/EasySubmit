import { extractResumeFromSections } from "@/lib/resume/openResume/extract-resume-from-sections";
import { groupLinesIntoSections } from "@/lib/resume/openResume/group-lines-into-sections";
import { groupTextItemsIntoLines } from "@/lib/resume/openResume/group-text-items-into-lines";
import { readPdfFromBuffer } from "@/lib/resume/openResume/readPdf";
import type { Resume } from "@/lib/resume/openResume/types";

/**
 * Server-side PDF parser (legacy). Prefer browser `parseResumeFromPdfClient`.
 * Node legacy pdfjs does not resolve font names reliably — bold/section heuristics fail.
 */
export async function parseResumeFromPdfBuffer(buffer: Buffer): Promise<Resume> {
  const textItems = await readPdfFromBuffer(buffer);
  const lines = groupTextItemsIntoLines(textItems);
  const sections = groupLinesIntoSections(lines);
  return extractResumeFromSections(sections);
}
