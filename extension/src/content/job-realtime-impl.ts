import { createClient } from "@supabase/supabase-js";
import {
  subscribeJobStatusRealtime,
  type JobStatusChangeHandler,
} from "@shared/extension/realtime-sync";
import { EXTENSION_MESSAGE } from "@shared/extension/constants";
import type { ExtensionJobRealtimeOptions } from "./job-realtime";

type RealtimeTokenResponse = {
  success: boolean;
  token?: string;
  userId?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  error?: string;
};

async function fetchRealtimeToken(
  sendMessage: (msg: Record<string, unknown>) => Promise<RealtimeTokenResponse | undefined>,
): Promise<{ token: string; userId: string; supabaseUrl: string; supabaseKey: string } | null> {
  const res = await sendMessage({ action: EXTENSION_MESSAGE.GET_REALTIME_TOKEN });
  console.log("[EasySubmit] realtime:token-response", { success: res?.success, hasToken: Boolean(res?.token) });
  if (
    !res?.success ||
    !res.token ||
    !res.userId ||
    !res.supabaseUrl ||
    !res.supabaseKey
  ) {
    return null;
  }
  return { token: res.token, userId: res.userId, supabaseUrl: res.supabaseUrl, supabaseKey: res.supabaseKey };
}

export async function startJobStatusRealtimeImpl(
  options: ExtensionJobRealtimeOptions & { jobId: string; onStatus: JobStatusChangeHandler },
): Promise<() => Promise<void>> {
  const credentials = await fetchRealtimeToken(options.sendMessage);
  if (!credentials) {
    console.warn("[EasySubmit] realtime:subscribe aborted — no credentials", { jobId: options.jobId });
    return async () => undefined;
  }

  const supabase = createClient(credentials.supabaseUrl, credentials.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await supabase.realtime.setAuth(credentials.token);

  console.log("[EasySubmit] realtime:subscribed to job status", { jobId: options.jobId });
  const subscription = subscribeJobStatusRealtime(supabase, options.jobId, options.onStatus);
  return async () => {
    console.log("[EasySubmit] realtime:unsubscribed from job status", { jobId: options.jobId });
    await subscription.unsubscribe();
  };
}
