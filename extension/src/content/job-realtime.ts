import { createClient } from "@supabase/supabase-js";
import {
  fetchJobTrackerRealtimeCredentials,
  subscribeJobStatusRealtime,
  subscribeJobTrackerRealtime,
  type JobStatusChangeHandler,
} from "@shared/extension/realtime-sync";

export type ExtensionJobRealtimeOptions = {
  apiBaseUrl: string;
  getAuthToken: () => Promise<string | null>;
  onSync: () => void;
};

let activeStop: (() => Promise<void>) | null = null;

/** Extension content-script Realtime — falls back silently when token API unavailable. */
export async function startExtensionJobRealtime(
  options: ExtensionJobRealtimeOptions,
): Promise<() => Promise<void>> {
  await stopExtensionJobRealtime();

  const token = await options.getAuthToken();
  if (!token) {
    return async () => undefined;
  }

  const credentials = await fetchJobTrackerRealtimeCredentials(
    `${options.apiBaseUrl.replace(/\/$/, "")}/api/extension/realtime-token`,
    { authorization: `Bearer ${token}` },
  );

  if (!credentials) {
    return async () => undefined;
  }

  const supabase = createClient(credentials.supabaseUrl, credentials.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await supabase.realtime.setAuth(credentials.token);

  const subscription = subscribeJobTrackerRealtime(supabase, credentials.userId, {
    onChange: options.onSync,
  });

  const stop = async () => {
    await subscription.unsubscribe();
  };

  activeStop = stop;
  return stop;
}

export async function stopExtensionJobRealtime(): Promise<void> {
  if (!activeStop) return;
  const stop = activeStop;
  activeStop = null;
  await stop();
}

let activeJobStatusStop: (() => Promise<void>) | null = null;

/**
 * Subscribe to status changes for a specific job entry via Supabase Realtime.
 * Calls onStatus each time the job's status column changes.
 * Replaces polling for pipeline state transitions.
 */
export async function startJobStatusRealtime(
  options: ExtensionJobRealtimeOptions & { jobId: string; onStatus: JobStatusChangeHandler },
): Promise<() => Promise<void>> {
  await stopJobStatusRealtime();

  const token = await options.getAuthToken();
  if (!token) return async () => undefined;

  const credentials = await fetchJobTrackerRealtimeCredentials(
    `${options.apiBaseUrl.replace(/\/$/, "")}/api/extension/realtime-token`,
    { authorization: `Bearer ${token}` },
  );
  if (!credentials) return async () => undefined;

  const supabase = createClient(credentials.supabaseUrl, credentials.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await supabase.realtime.setAuth(credentials.token);

  const subscription = subscribeJobStatusRealtime(supabase, options.jobId, options.onStatus);
  const stop = async () => {
    await subscription.unsubscribe();
  };
  activeJobStatusStop = stop;
  return stop;
}

export async function stopJobStatusRealtime(): Promise<void> {
  if (!activeJobStatusStop) return;
  const stop = activeJobStatusStop;
  activeJobStatusStop = null;
  await stop();
}
