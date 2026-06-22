export type JobStatusSnapshot = {
  saved: boolean;
  status?: string;
  id?: string;
};

export type PollJobStatusOptions = {
  intervalMs?: number;
  maxMs?: number;
  fetchStatus: () => Promise<JobStatusSnapshot>;
  isDone?: (snapshot: JobStatusSnapshot) => boolean;
};

export type PollJobStatusResult =
  | { ok: true; snapshot: JobStatusSnapshot }
  | { ok: false; reason: "timeout"; snapshot: JobStatusSnapshot };

export function isTerminalPipelineStatus(status?: string): boolean {
  return status === "READY_TO_APPLY" || status === "APPLIED";
}

export async function pollJobStatusUntil(
  options: PollJobStatusOptions,
): Promise<PollJobStatusResult> {
  const intervalMs = options.intervalMs ?? 2000;
  const maxMs = options.maxMs ?? 120_000;
  const isDone =
    options.isDone ??
    ((snapshot: JobStatusSnapshot) =>
      Boolean(snapshot.saved && isTerminalPipelineStatus(snapshot.status)));

  const deadline = Date.now() + maxMs;
  let snapshot = await options.fetchStatus();

  if (isDone(snapshot)) {
    return { ok: true, snapshot };
  }

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    snapshot = await options.fetchStatus();
    if (isDone(snapshot)) {
      return { ok: true, snapshot };
    }
  }

  return { ok: false, reason: "timeout", snapshot };
}
