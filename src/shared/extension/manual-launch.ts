import { canApplyCapture } from "@shared/extension/apply-gate";
import { hasStrongJobUrlSignal } from "@shared/extension/job-url-parse";
import type { CardPresentation } from "@shared/extension/card-presentation";

/** Which card mode to use when the user explicitly forces the card open. */
export function resolveManualLaunchPresentation(input: {
  url: string;
  description: string | null | undefined;
  onJobPage: boolean;
}): Extract<CardPresentation, "job" | "loading" | "manual_capture"> {
  const capture = { url: input.url, description: input.description ?? null };

  if (canApplyCapture(capture)) {
    return "job";
  }

  if (hasStrongJobUrlSignal(input.url) || input.onJobPage) {
    return "loading";
  }

  return "manual_capture";
}
