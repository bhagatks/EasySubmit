import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  dataArtifact,
  flagsArtifact,
} from "@/lib/extension/pipeline-debug-sanitize";
import type { PipelineDebugArtifact } from "@/src/shared/extension/pipeline-debug-artifacts";
import type { FeatureFlagsSnapshot } from "@/src/lib/services/feature-flags-service";
import {
  summarizeExperienceBullets,
  summarizeFormForLog,
  summarizeFormDelta,
} from "@/src/lib/ai/engine/enhance-logger";

export function profileLoadArtifacts(
  form: HubRefineryForm,
  source: { id: string; firstName?: string | null; lastName?: string | null },
): PipelineDebugArtifact[] {
  return [
    dataArtifact("Source profile", {
      sourceProfileId: source.id,
      displayName: [source.firstName, source.lastName].filter(Boolean).join(" ").trim() || source.id,
    }),
    dataArtifact("Base form summary", summarizeFormForLog(form), "input"),
    dataArtifact("Experience bullets", summarizeExperienceBullets(form), "input"),
    dataArtifact("Skills preview", {
      skillsTextPreview: (form.skillsText ?? "").trim().slice(0, 240),
      skillCount: (form.skillsText ?? "").split(",").filter(Boolean).length,
    }, "input"),
    dataArtifact("Summary preview", {
      professionalSummaryPreview: (form.professionalSummary ?? "").trim().slice(0, 240),
    }, "input"),
  ];
}

export function formDeltaArtifacts(
  label: string,
  before: HubRefineryForm,
  after: HubRefineryForm,
): PipelineDebugArtifact[] {
  return [dataArtifact(label, summarizeFormDelta(before, after), "output")];
}

export function featureFlagsArtifacts(
  flags: FeatureFlagsSnapshot,
  enhance?: Record<string, unknown>,
): PipelineDebugArtifact[] {
  const rows: PipelineDebugArtifact[] = [flagsArtifact("Feature flags", { ...flags })];
  if (enhance) {
    rows.push(flagsArtifact("Enhance gate resolution", enhance));
  }
  return rows;
}

export function captureValidateArtifacts(input: {
  url?: string | null;
  title?: string | null;
  company?: string | null;
  descriptionChars?: number;
  platform?: string | null;
  sourceProfileId?: string | null;
}): PipelineDebugArtifact[] {
  return [dataArtifact("Capture payload", input, "input")];
}
