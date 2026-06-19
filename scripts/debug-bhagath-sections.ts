import { readFile } from "node:fs/promises";
import { extractResumeFromSections } from "@/lib/resume/openResume/extract-resume-from-sections";
import { groupLinesIntoSections } from "@/lib/resume/openResume/group-lines-into-sections";
import { groupTextItemsIntoLines } from "@/lib/resume/openResume/group-text-items-into-lines";
import { parseResumeFromPdfBuffer } from "@/lib/resume/openResume/index";
import { readPdfFromBuffer } from "@/lib/resume/openResume/readPdf";

async function main() {
  const buf = await readFile("ATS_Bhagath_Sample.pdf");
  const textItems = await readPdfFromBuffer(buf);
  const lines = groupTextItemsIntoLines(textItems);
  const sections = groupLinesIntoSections(lines);

  console.log("Section keys:", Object.keys(sections));
  for (const [name, secLines] of Object.entries(sections)) {
    console.log(`\n=== ${name} (${secLines.length} lines) ===`);
    for (const line of secLines.slice(0, 8)) {
      console.log(
        line.map((t) => t.text).join(" | "),
      );
    }
    if (secLines.length > 8) console.log(`... +${secLines.length - 8} more`);
  }
}

main().catch(console.error);
