import type { ResumeSectionToLines } from "@/lib/resume/openResume/types";
import { getSectionLinesByKeywords } from "@/lib/resume/openResume/extract-resume-from-sections/lib/get-section-lines";
import {
  getBulletPointsFromLines,
  getDescriptionsLineIdx,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/bullet-points";

export const extractCertifications = (sections: ResumeSectionToLines): string[] => {
  const lines = getSectionLinesByKeywords(sections, [
    "certification",
    "certificate",
    "licens",
  ]);
  if (lines.length === 0) return [];

  const descriptionsLineIdx = getDescriptionsLineIdx(lines) ?? 0;
  const bodyLines = lines.slice(descriptionsLineIdx);
  return getBulletPointsFromLines(bodyLines).filter((line) => line.trim());
};
