import { detectJobPage } from "@shared/extension/detect-job-page";
import { buildFallbackJobMetadata } from "@shared/extension/force-metadata";
import { isJobPage } from "@shared/extension/is-job-page";
import { canApplyCapture } from "@shared/extension/apply-gate";
import { hasStrongJobUrlSignal } from "@shared/extension/job-url-parse";
import { isGreenhouseEmbeddedJobUrl } from "@shared/extension/greenhouse-helpers";
import {
  buildLoadingJobMetadata,
  buildManualCaptureMetadata,
  buildNoJobDetectedMetadata,
  type CardPresentation,
} from "@shared/extension/card-presentation";
import type { ExtensionRuntimeConfig, ScrapedJobMetadata } from "@shared/extension/types";

export type ResolveCardContentInput = {
  doc: Document;
  url: string;
  config: ExtensionRuntimeConfig;
  launch: "auto" | "manual";
  interceptedMetadata: ScrapedJobMetadata | null;
};

export function scrapeJobMetadata(
  input: ResolveCardContentInput,
): ScrapedJobMetadata {
  const detected =
    detectJobPage(input.doc, input.url, input.config) ??
    ({
      metadata: buildFallbackJobMetadata(input.doc, input.url, input.config),
    } as const);
  return input.interceptedMetadata ?? detected.metadata;
}

export function resolveCardContent(
  input: ResolveCardContentInput,
): { presentation: CardPresentation; metadata: ScrapedJobMetadata } {
  const onJobPage = isJobPage(input.doc, input.url);
  const metadata = scrapeJobMetadata(input);
  const capture = {
    url: input.url,
    description: metadata.description,
  };

  if (input.launch === "manual") {
    if (canApplyCapture(capture)) {
      return { presentation: "job", metadata };
    }
    if (hasStrongJobUrlSignal(input.url)) {
      return { presentation: "loading", metadata: buildLoadingJobMetadata() };
    }
    return { presentation: "manual_capture", metadata: buildManualCaptureMetadata() };
  }

  if (!onJobPage) {
    return { presentation: "no_job", metadata: buildNoJobDetectedMetadata() };
  }

  if (canApplyCapture(capture)) {
    return { presentation: "job", metadata };
  }

  if (hasStrongJobUrlSignal(input.url)) {
    const metadata = buildLoadingJobMetadata();
    if (isGreenhouseEmbeddedJobUrl(input.url)) {
      metadata.platform = "greenhouse";
    }
    return { presentation: "loading", metadata };
  }

  return { presentation: "no_job", metadata: buildNoJobDetectedMetadata() };
}
