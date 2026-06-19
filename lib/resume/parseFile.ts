import mammoth from "mammoth";

export type SupportedResumeMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isPdfFile(file: File): boolean {
  return file.type === PDF_MIME || /\.pdf$/i.test(file.name);
}

export function isDocxFile(file: File): boolean {
  return file.type === DOCX_MIME || /\.docx$/i.test(file.name);
}

export function isSupportedResumeFile(file: File): boolean {
  return isPdfFile(file) || isDocxFile(file);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

export async function extractResumeText(file: File, buffer: Buffer): Promise<string> {
  if (isPdfFile(file)) {
    return extractPdfText(buffer);
  }

  if (isDocxFile(file)) {
    return extractDocxText(buffer);
  }

  throw new Error("Unsupported file type. Upload a PDF or DOCX resume.");
}

export function resumeContentType(file: File): string {
  if (isPdfFile(file)) {
    return PDF_MIME;
  }

  if (isDocxFile(file)) {
    return DOCX_MIME;
  }

  return "application/octet-stream";
}
