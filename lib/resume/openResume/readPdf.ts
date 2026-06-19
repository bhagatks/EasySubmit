import path from "node:path";
import { pathToFileURL } from "node:url";
import type { TextItem as PdfjsTextItem } from "pdfjs-dist/types/src/display/api";
import type { TextItem, TextItems } from "@/lib/resume/openResume/types";

let pdfjsInitialized = false;

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");

  if (!pdfjsInitialized) {
    const workerPath = path.join(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.js",
    );
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
    pdfjsInitialized = true;
  }

  return pdfjs;
}

/**
 * Read a PDF buffer into positioned text items (Open-Resume step 1).
 * Single-column English resumes only.
 */
export async function readPdfFromBuffer(buffer: Buffer): Promise<TextItems> {
  const pdfjs = await getPdfJs();
  const pdfFile = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  let textItems: TextItems = [];

  for (let pageNum = 1; pageNum <= pdfFile.numPages; pageNum++) {
    const page = await pdfFile.getPage(pageNum);
    const textContent = await page.getTextContent();
    await page.getOperatorList();
    const commonObjs = page.commonObjs;

    const pageTextItems = textContent.items.map((item) => {
      const {
        str: text,
        transform,
        fontName: pdfFontName,
        ...otherProps
      } = item as PdfjsTextItem;

      const x = transform[4];
      const y = transform[5];
      const fontObj = commonObjs.get(pdfFontName);
      const fontName = fontObj?.name ?? pdfFontName;
      const newText = text.replace(/-­‐/g, "-");

      return {
        ...otherProps,
        fontName,
        text: newText,
        x,
        y,
      } as TextItem;
    });

    textItems.push(...pageTextItems);
  }

  const isEmptySpace = (textItem: TextItem) =>
    !textItem.hasEOL && textItem.text.trim() === "";

  return textItems.filter((textItem) => !isEmptySpace(textItem));
}
