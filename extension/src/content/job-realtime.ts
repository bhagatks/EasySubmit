import type { JobStatusChangeHandler } from "@shared/extension/realtime-sync";

export type ExtensionJobRealtimeOptions = {
  apiBaseUrl: string;
  getAuthToken: () => Promise<string | null>;
  sendMessage: (msg: Record<string, unknown>) => Promise<unknown>;
  onSync: () => void;
};

type JobRealtimeImpl = typeof import("./job-realtime-impl");

let implModule: JobRealtimeImpl | null = null;
let implLoad: Promise<JobRealtimeImpl> | null = null;

let activeJobStatusStop: (() => Promise<void>) | null = null;

async function loadJobRealtimeImpl(): Promise<JobRealtimeImpl> {
  if (implModule) return implModule;
  if (!implLoad) {
    const url = chrome.runtime.getURL("job-realtime-impl.js");
    implLoad = import(/* @vite-ignore */ url) as Promise<JobRealtimeImpl>;
  }
  implModule = await implLoad;
  return implModule;
}

export function isJobStatusRealtimeActive(): boolean {
  return activeJobStatusStop !== null;
}

/** Subscribe to status changes for a specific job entry via Supabase Realtime. */
export async function startJobStatusRealtime(
  options: ExtensionJobRealtimeOptions & { jobId: string; onStatus: JobStatusChangeHandler },
): Promise<() => Promise<void>> {
  await stopJobStatusRealtime();

  const impl = await loadJobRealtimeImpl();
  const stop = await impl.startJobStatusRealtimeImpl(options);
  activeJobStatusStop = stop;
  return stop;
}

export async function stopJobStatusRealtime(): Promise<void> {
  if (!activeJobStatusStop) return;
  const stop = activeJobStatusStop;
  activeJobStatusStop = null;
  await stop();
}
