import type {
  ParsedEducation,
  ParsedWorkExperience,
  StructuredResume,
} from "@/lib/resume/heuristicParser";

export type { ParsedEducation, ParsedWorkExperience, StructuredResume };

export type ParseResumeMeta = {
  jobCount: number;
  skillCount: number;
  educationCount: number;
  parser: "open-resume-pdf" | "open-resume-docx-via-pdf" | "heuristic-docx";
  rawText: string;
};

export type ParseResumeSuccess = {
  success: true;
  data: StructuredResume;
  meta: ParseResumeMeta;
};

export type ParseResumeError = {
  success: false;
  error: string;
};

export type ParseResumeResult = ParseResumeSuccess | ParseResumeError;

export function buildParseResumeMeta(
  data: StructuredResume,
  parser: ParseResumeMeta["parser"],
  rawText: string,
): ParseResumeMeta {
  return {
    jobCount: data.experience.length,
    skillCount: data.skills.length,
    educationCount: data.education.length,
    parser,
    rawText,
  };
}
