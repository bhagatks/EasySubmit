"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractResumeContact } from "@/lib/resume/extractContact";
import {
  extractResumeText,
  isSupportedResumeFile,
} from "@/lib/resume/parseFile";
import { extractSkillsFromText } from "@/lib/resume/skills";

export type ProcessResumeResult = {
  success: true;
  rawText: string;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  skills: string[];
};

export type ProcessResumeError = {
  success: false;
  error: string;
};

function getResumeFile(formData: FormData): File | null {
  const file = formData.get("file") ?? formData.get("resume");

  if (file instanceof File && file.size > 0) {
    return file;
  }

  return null;
}

/**
 * In-memory resume processor: extract text (pdf-parse / mammoth), contact heuristics, skill scan.
 * The uploaded file is never persisted to disk or object storage.
 */
export async function processResume(
  formData: FormData,
): Promise<ProcessResumeResult | ProcessResumeError> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const file = getResumeFile(formData);

    if (!file) {
      return { success: false, error: "Resume file is required" };
    }

    if (!isSupportedResumeFile(file)) {
      return {
        success: false,
        error: "Unsupported file type. Upload a PDF or DOCX resume.",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = (await extractResumeText(file, buffer)).trim();

    if (!rawText) {
      return { success: false, error: "Could not extract text from the resume" };
    }

    const { essentials, urls } = extractResumeContact(rawText);
    const skills = extractSkillsFromText(rawText);

    return {
      success: true,
      rawText,
      email: essentials.email,
      phone: essentials.phone,
      linkedIn: urls.linkedin,
      skills,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process resume";
    return { success: false, error: message };
  }
}
