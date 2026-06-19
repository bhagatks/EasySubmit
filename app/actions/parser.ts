"use server";

export type {
  ParsedEducation,
  ParsedWorkExperience,
  StructuredResume,
  ParseResumeMeta,
  ParseResumeSuccess,
  ParseResumeError,
  ParseResumeResult,
} from "@/lib/resume/parseResumeTypes";

export { buildParseResumeMeta } from "@/lib/resume/parseResumeTypes";

export { parseResumeDocxAction } from "@/app/actions/parseResumeDocx";

/**
 * @deprecated PDF parsing runs client-side via `parseResumeFile`.
 * Server action retained for DOCX-only callers.
 */
export { parseResumeDocxAction as parseResumeAction } from "@/app/actions/parseResumeDocx";
