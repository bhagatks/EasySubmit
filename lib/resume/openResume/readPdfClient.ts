import { initPdfJsClient } from "@/lib/resume/openResume/initPdfJsClient";
import type { TextItem as PdfjsTextItem } from "pdfjs-dist/types/src/display/api";
import type { TextItem, TextItems } from "@/lib/resume/openResume/types";

/**
 * Open-Resume step 1 (browser): read a PDF blob URL into positioned text items.
 * Font names come from commonObjs — required for bold/section heuristics.
 */
export async function readPdfClient(fileUrl: string): Promise<TextItems> {
  const pdfjs = await initPdfJsClient();
  const pdfFile = await pdfjs.getDocument(fileUrl).promise;
  let textItems: TextItems = [];

  for (let pageNum = 1; pageNum <= pdfFile.numPages; pageNum++) {
    const page = await pdfFile.getPage(pageNum);
    const textContent = await page.getTextContent();
    await page.getOperatorList();
    const commonObjs = page.commonObjs;

    const pageTextItems = textContent.items.map((item: Record<string, unknown>) => {
      const {
        str: text,
        transform,
        fontName: pdfFontName,
        ...otherProps
      } = item as PdfjsTextItem;

      const x = transform[4];
      const y = transform[5];
      const fontObj = commonObjs.get(pdfFontName);
      const fontName = fontObj.name;
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
