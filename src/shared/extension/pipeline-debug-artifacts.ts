/** QA overlay artifacts — stored on job row, not sent to PostHog. */

export type PipelineDebugArtifactKind =
  | "data"
  | "input"
  | "output"
  | "ai_request"
  | "ai_response"
  | "external_request"
  | "external_response"
  | "flags";

export type PipelineDebugArtifact = {
  kind: PipelineDebugArtifactKind;
  label: string;
  payload: unknown;
};

export function mergePipelineDebugArtifacts(
  existing: PipelineDebugArtifact[] | undefined,
  incoming: PipelineDebugArtifact[] | undefined,
): PipelineDebugArtifact[] | undefined {
  if (!incoming?.length) return existing;
  const byLabel = new Map<string, PipelineDebugArtifact>();
  for (const row of existing ?? []) {
    byLabel.set(row.label, row);
  }
  for (const row of incoming) {
    byLabel.set(row.label, row);
  }
  return Array.from(byLabel.values());
}
