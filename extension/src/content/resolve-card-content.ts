import { detectJobPage } from "@shared/extension/detect-job-page";
import { buildFallbackJobMetadata } from "@shared/extension/force-metadata";
import { isJobPage } from "@shared/extension/is-job-page";
import { canApplyCapture } from "@shared/extension/apply-gate";
import { resolveManualLaunchPresentation } from "@shared/extension/manual-launch";
import { hasStrongJobUrlSignal } from "@shared/extension/job-url-parse";
import { isGreenhouseEmbeddedJobUrl, isGreenhouseBoardJobUrl } from "@shared/extension/greenhouse-helpers";
import {
  buildLoadingJobMetadata,
  buildManualCaptureMetadata,
  buildNoJobDetectedMetadata,
  type CardPresentation,
} from "@shared/extension/card-presentation";
import { resolveJobIdentity } from "@shared/extension/job-identity";
import { isGenericNavigationJobTitle } from "@shared/extension/scrape-helpers";
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
    const presentation = resolveManualLaunchPresentation({
      url: input.url,
      description: metadata.description,
      onJobPage,
    });
    if (presentation === "job") {
      return { presentation: "job", metadata };
    }
    if (presentation === "loading") {
      return { presentation: "loading", metadata: buildLoadingJobMetadata() };
    }
    return { presentation: "manual_capture", metadata: buildManualCaptureMetadata() };
  }

  if (!onJobPage) {
    return { presentation: "no_job", metadata: buildNoJobDetectedMetadata() };
  }

  if (!canApplyCapture(capture)) {
    const loadingMetadata = buildLoadingJobMetadata();
    if (metadata.platform && metadata.platform !== "generic") {
      loadingMetadata.platform = metadata.platform;
    }
    if (isGreenhouseEmbeddedJobUrl(input.url) || isGreenhouseBoardJobUrl(input.url)) {
      loadingMetadata.platform = "greenhouse";
    }
    return { presentation: "loading", metadata: loadingMetadata };
  }

  const identity = resolveJobIdentity({
    url: input.url,
    title: metadata.title,
    company: metadata.company,
    description: metadata.description,
  });
  if (isGenericNavigationJobTitle(identity.title)) {
    if (hasStrongJobUrlSignal(input.url)) {
      const loadingMetadata = buildLoadingJobMetadata();
      if (isGreenhouseEmbeddedJobUrl(input.url) || isGreenhouseBoardJobUrl(input.url)) {
        loadingMetadata.platform = "greenhouse";
      }
      return { presentation: "loading", metadata: loadingMetadata };
    }
    return { presentation: "no_job", metadata: buildNoJobDetectedMetadata() };
  }
  return {
    presentation: "job",
    metadata: {
      ...metadata,
      title: identity.title,
      company: identity.company ?? metadata.company,
    },
  };
}
