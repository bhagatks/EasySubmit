"use server";

import mammoth from "mammoth";
import { parseResumeHeuristics } from "@/lib/resume/heuristicParser";
import { isDocxFile } from "@/lib/resume/parseFile";
import {
  buildParseResumeMeta,
  type ParseResumeResult,
} from "@/lib/resume/parseResumeTypes";

function getResumeFile(formData: FormData): File | null {
  const file = formData.get("file") ?? formData.get("resume");

  if (file instanceof File && file.size > 0) {
    return file;
  }

  return null;
}

/**
 * DOCX-only server parser (interim until client docx-wasm → PDF path ships).
 */
export async function parseResumeDocxAction(
  formData: FormData,
): Promise<ParseResumeResult> {
  try {
    const file = getResumeFile(formData);

    if (!file) {
      return { success: false, error: "Resume file is required" };
    }

    if (!isDocxFile(file)) {
      return {
        success: false,
        error: "Expected a DOCX file. PDF parsing runs in the browser.",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    const rawText = (result.value ?? "").trim();

    if (!rawText) {
      return { success: false, error: "Could not extract text from the resume" };
    }

    const data = parseResumeHeuristics(rawText);

    return {
      success: true,
      data,
      meta: buildParseResumeMeta(data, "heuristic-docx", rawText),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse resume";
    return { success: false, error: message };
  }
}
