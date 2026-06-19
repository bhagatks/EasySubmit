import { parseResumeDocxAction } from "@/app/actions/parseResumeDocx";
import { openResumeToStructured } from "@/lib/resume/openResume/adapter";
import { parseResumeFromPdfClient } from "@/lib/resume/openResume/parseResumeFromPdfClient";
import {
  isDocxFile,
  isPdfFile,
  isSupportedResumeFile,
} from "@/lib/resume/parseFile";
import {
  buildParseResumeMeta,
  type ParseResumeMeta,
  type ParseResumeResult,
} from "@/lib/resume/parseResumeTypes";

async function convertDocxToPdfBlob(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/resume/convert-docx", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to convert Word resume to PDF";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return response.blob();
}

async function parsePdfBlob(
  pdfBlob: Blob,
  parserLabel: ParseResumeMeta["parser"],
): Promise<ParseResumeResult> {
  const fileUrl = URL.createObjectURL(pdfBlob);

  try {
    const { resume, rawText } = await parseResumeFromPdfClient(fileUrl);
    const data = openResumeToStructured(resume);

    return {
      success: true,
      data,
      meta: buildParseResumeMeta(data, parserLabel, rawText),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse resume PDF";
    return { success: false, error: message };
  } finally {
    URL.revokeObjectURL(fileUrl);
  }
}

/**
 * Client-side resume parser entry point.
 * PDF → browser Open-Resume engine (pdfjs + coordinate/font scoring).
 * DOCX → server WASM convert to PDF, then same Open-Resume PDF pipeline.
 */
export async function parseResumeFile(file: File): Promise<ParseResumeResult> {
  if (!isSupportedResumeFile(file)) {
    return {
      success: false,
      error: "Unsupported file type. Upload a PDF or DOCX resume.",
    };
  }

  if (isPdfFile(file)) {
    return parsePdfBlob(file, "open-resume-pdf");
  }

  if (isDocxFile(file)) {
    try {
      const pdfBlob = await convertDocxToPdfBlob(file);
      const result = await parsePdfBlob(pdfBlob, "open-resume-docx-via-pdf");

      if (result.success) {
        return result;
      }

      // Fallback if converted PDF fails Open-Resume heuristics
      const formData = new FormData();
      formData.set("file", file);
      return parseResumeDocxAction(formData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to convert Word resume";
      return { success: false, error: message };
    }
  }

  return {
    success: false,
    error: "Unsupported file type. Upload a PDF or DOCX resume.",
  };
}
