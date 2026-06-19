import { readFile } from "node:fs/promises";
import { convertDocxBufferToPdf } from "@/lib/resume/convertDocxToPdf.server";

async function main() {
  const buf = await readFile("ATS_Universal_Resume_Template.docx");
  const pdf = await convertDocxBufferToPdf(buf);
  console.log("PDF bytes:", pdf.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
