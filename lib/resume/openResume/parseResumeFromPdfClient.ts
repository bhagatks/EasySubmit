import { extractResumeFromSections } from "@/lib/resume/openResume/extract-resume-from-sections";
import { groupLinesIntoSections } from "@/lib/resume/openResume/group-lines-into-sections";
import { groupTextItemsIntoLines } from "@/lib/resume/openResume/group-text-items-into-lines";
import { readPdfClient } from "@/lib/resume/openResume/readPdfClient";
import type { Lines, Resume } from "@/lib/resume/openResume/types";

function linesToRawText(lines: Lines): string {
  return lines
    .map((line) => line.map((item) => item.text).join(""))
    .filter((line) => line.trim())
    .join("\n");
}

/**
 * Full Open-Resume PDF pipeline in the browser (same steps as open-resume.com).
 */
export async function parseResumeFromPdfClient(fileUrl: string): Promise<{
  resume: Resume;
  rawText: string;
}> {
  const textItems = await readPdfClient(fileUrl);
  const lines = groupTextItemsIntoLines(textItems);
  const sections = groupLinesIntoSections(lines);
  const resume = extractResumeFromSections(sections);

  return {
    resume,
    rawText: linesToRawText(lines),
  };
}
