export type EnhanceTraceCallRow = {
  operation: string;
  status: string;
  errorCode?: string | null;
};

export type EnhanceTraceJobMeta = {
  aiSucceeded?: boolean;
  aiAttempted?: boolean;
};

/** Summarize a trace for QA — job meta wins over raw api_call_logs when resume succeeded. */
export function resolveEnhanceTraceOutcome(
  rows: EnhanceTraceCallRow[],
  jobMeta?: EnhanceTraceJobMeta | null,
): string {
  if (rows.length === 0) return "no calls";

  const resumeApiSuccess = rows.some(
    (r) => r.operation === "ai.enhance.generate_text" && r.status === "success",
  );
  const jdFailed = rows.some(
    (r) => r.operation === "ai.enhance.generate_object" && r.status === "error",
  );

  if (jobMeta?.aiSucceeded === false && jobMeta.aiAttempted) {
    return resumeApiSuccess ? "AI failed (parse/degraded — API ok)" : "AI failed";
  }

  if (jobMeta?.aiSucceeded === true) {
    if (jdFailed) return "AI success (partial — JD fallback)";
    return "AI success";
  }

  const allOk = rows.every((r) => r.status === "success");
  if (allOk && resumeApiSuccess) return "AI success";

  if (resumeApiSuccess) {
    if (jdFailed) return "AI success (partial — JD fallback)";
    return "AI success (partial)";
  }

  return "AI failed";
}
