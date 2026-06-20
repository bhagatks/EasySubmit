import path from "node:path";
import {
  ATS_TEMPLATE_DOCX_RELATIVE_PATH,
  ATS_TEMPLATE_PDF_RELATIVE_PATH,
  BHAGATH_SAMPLE_PDF_RELATIVE_PATH,
  RESUME_RULES_RELATIVE_PATH,
} from "@/lib/resume/resumeSpec";

export function getProjectRoot(cwd = process.cwd()): string {
  return cwd;
}

export function getResumeRulesPath(cwd = process.cwd()): string {
  return path.join(getProjectRoot(cwd), RESUME_RULES_RELATIVE_PATH);
}

export function getAtsTemplatePdfPath(cwd = process.cwd()): string {
  return path.join(getProjectRoot(cwd), ATS_TEMPLATE_PDF_RELATIVE_PATH);
}

export function getAtsTemplateDocxPath(cwd = process.cwd()): string {
  return path.join(getProjectRoot(cwd), ATS_TEMPLATE_DOCX_RELATIVE_PATH);
}

export function getBhagathSamplePdfPath(cwd = process.cwd()): string {
  return path.join(getProjectRoot(cwd), BHAGATH_SAMPLE_PDF_RELATIVE_PATH);
}
