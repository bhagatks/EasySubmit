import { readFile } from "node:fs/promises";
import { convertDocxBufferToPdf } from "@/lib/resume/convertDocxToPdf.server";
import { getAtsTemplateDocxPath } from "@/lib/resume/resumeFixtures.server";

async function main() {
  const buf = await readFile(getAtsTemplateDocxPath());
  const pdf = await convertDocxBufferToPdf(buf);
  console.log("PDF bytes:", pdf.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
