import { parseEnhancedResumeBody } from "@/src/lib/ai/engine/post-process";
import type { ResumeBodyForm } from "@/src/lib/ai/engine/candidate-context";
import type { AiCallClassification } from "@/lib/ai/call-kernel/types";

export type ClassifiedAiOutput =
  | { classification: "success"; body: Partial<ResumeBodyForm> }
  | { classification: "empty_response" }
  | { classification: "parse_failed" };

export function classifyAiOutput(text: string): ClassifiedAiOutput {
  const trimmed = text.trim();
  if (!trimmed) {
    return { classification: "empty_response" };
  }

  const body = parseEnhancedResumeBody(trimmed);
  if (!body) {
    return { classification: "parse_failed" };
  }

  return { classification: "success", body };
}

export function outputClassificationToAiCall(
  output: ClassifiedAiOutput,
): Extract<AiCallClassification, "success" | "parse_failed" | "empty_response"> {
  return output.classification;
}
