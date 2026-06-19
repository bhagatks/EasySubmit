import path from "node:path";
import {
  ATS_TEMPLATE_DOCX_FILENAME,
  ATS_TEMPLATE_PDF_FILENAME,
  BHAGATH_SAMPLE_PDF_FILENAME,
  RESUME_RULES_FILENAME,
} from "@/lib/resume/resumeSpec";

export function getProjectRoot(cwd = process.cwd()): string {
  return cwd;
}

export function getResumeRulesPath(cwd = process.cwd()): string {
  return path.join(getProjectRoot(cwd), RESUME_RULES_FILENAME);
}

export function getAtsTemplatePdfPath(cwd = process.cwd()): string {
  return path.join(getProjectRoot(cwd), ATS_TEMPLATE_PDF_FILENAME);
}

export function getAtsTemplateDocxPath(cwd = process.cwd()): string {
  return path.join(getProjectRoot(cwd), ATS_TEMPLATE_DOCX_FILENAME);
}

export function getBhagathSamplePdfPath(cwd = process.cwd()): string {
  return path.join(getProjectRoot(cwd), BHAGATH_SAMPLE_PDF_FILENAME);
}
