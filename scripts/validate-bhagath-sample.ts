import { readFile } from "node:fs/promises";
import { openResumeToStructured } from "@/lib/resume/openResume/adapter";
import { parseResumeFromPdfBuffer } from "@/lib/resume/openResume/index";
import { getBhagathSamplePdfPath } from "@/lib/resume/resumeFixtures.server";

async function main() {
  const pdfPath = getBhagathSamplePdfPath();
  const buffer = await readFile(pdfPath);
  const openResume = await parseResumeFromPdfBuffer(buffer);
  const structured = openResumeToStructured(openResume);

  const failures: string[] = [];

  if (!structured.name?.toLowerCase().includes("bhagath")) {
    failures.push("missing name");
  }
  if ((structured.summary?.length ?? 0) < 100) {
    failures.push("missing summary");
  }
  if (structured.experience.length < 3) {
    failures.push("expected >= 3 jobs");
  }

  const sevenEleven = structured.experience.find((entry) =>
    entry.company.toLowerCase().includes("7-eleven"),
  );
  if (!sevenEleven?.role.toLowerCase().match(/engineering manager|solution architect/)) {
    failures.push("7-Eleven job title not parsed");
  }
  if (!sevenEleven?.date.includes("2024")) {
    failures.push("7-Eleven date range missing");
  }

  if (!structured.education.some((entry) => /b\.tech|bachelor/i.test(entry.degree))) {
    failures.push("education degree missing");
  }
  if (!structured.certifications.some((entry) => /aws certified/i.test(entry))) {
    failures.push("AWS certification missing");
  }
  if (!structured.skills.join(" ").match(/AWS|Agile|Solution Design/i)) {
    failures.push("skills block missing");
  }

  if (failures.length > 0) {
    console.error("FAIL:", failures.join("; "));
    process.exit(1);
  }

  console.log("OK — Bhagath sample resume parsed successfully.");
  console.log(JSON.stringify({ experience: structured.experience, skills: structured.skills.slice(0, 8) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
