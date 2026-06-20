#!/usr/bin/env npx tsx
/**
 * Smoke-test the server PDF pipeline against ATS_Universal_Resume_Template.pdf
 * Golden template under assets/resume/templates/. Browser parsing (readPdfClient) is preferred in prod;
 * this uses the legacy Node pdfjs path for quick CI/dev checks.
 */
import { readFile } from "node:fs/promises";
import { openResumeToStructured } from "@/lib/resume/openResume/adapter";
import { parseResumeFromPdfBuffer } from "@/lib/resume/openResume/index";
import { getAtsTemplatePdfPath } from "@/lib/resume/resumeFixtures.server";

async function main() {
  const pdfPath = getAtsTemplatePdfPath();
  const buffer = await readFile(pdfPath);
  const openResume = await parseResumeFromPdfBuffer(buffer);
  const structured = openResumeToStructured(openResume);

  console.log("ATS template parse summary (server path):");
  console.log(`  file: ${pdfPath}`);
  console.log(`  name: ${structured.name ?? "(none)"}`);
  console.log(`  experience entries: ${structured.experience.length}`);
  console.log(`  education entries: ${structured.education.length}`);
  console.log(`  skills: ${structured.skills.length}`);
  console.log(`  summary: ${structured.summary ? "yes" : "no"}`);

  if (structured.experience.length < 1) {
    console.error("\nFAIL: expected at least 1 experience entry.");
    process.exit(1);
  }

  console.log(
    "\nOK — root fixture parsed. Compare with browser parseResumeFile for parity.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
