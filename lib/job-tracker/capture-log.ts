import {
  buildCaptureDiagnostics,
  logCaptureDiagnostics,
  type BuildCaptureDiagnosticsInput,
  type CaptureDiagnostics,
} from "@/src/shared/extension/capture-diagnostics";

export {
  buildCaptureDiagnostics,
  logCaptureDiagnostics,
  JOB_CAPTURE_LOG_PREFIX,
  type BuildCaptureDiagnosticsInput,
  type CaptureDiagnostics,
  type CaptureFieldDiagnostic,
} from "@/src/shared/extension/capture-diagnostics";

/** Persist diagnostics on save and emit structured server log when capture gaps exist. */
export function attachCaptureDiagnosticsToMetadata(
  input: BuildCaptureDiagnosticsInput,
  existingMetadata?: Record<string, unknown> | null,
): { metadata: Record<string, unknown>; diagnostics: CaptureDiagnostics } {
  const diagnostics = buildCaptureDiagnostics(input);
  const metadata = {
    ...(existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {}),
    captureDiagnostics: diagnostics,
    confidence:
      typeof input.metadata?.confidence === "number"
        ? input.metadata.confidence
        : existingMetadata?.confidence,
  };
  return { metadata, diagnostics };
}

export function logJobCaptureOnSave(
  diagnostics: CaptureDiagnostics,
  context: { userId: string; entryId: string },
): void {
  logCaptureDiagnostics(diagnostics, {
    userId: context.userId,
    entryId: context.entryId,
    phase: "server-save",
  });
}
