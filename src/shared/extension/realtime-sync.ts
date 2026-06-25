import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type JobTrackerRealtimeHandlers = {
  onChange: () => void;
  onError?: (message: string) => void;
};

export type JobTrackerRealtimeSubscription = {
  unsubscribe: () => Promise<void>;
};

type RealtimeTokenResponse = {
  success?: boolean;
  token?: string | null;
  userId?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  error?: string;
};

/** Subscribe to `job_tracker_entries` changes for one user. Caller supplies authenticated Supabase client. */
export function subscribeJobTrackerRealtime(
  supabase: SupabaseClient,
  userId: string,
  handlers: JobTrackerRealtimeHandlers,
): JobTrackerRealtimeSubscription {
  const channel: RealtimeChannel = supabase
    .channel(`job-tracker-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "job_tracker_entries",
        filter: `userId=eq.${userId}`,
      },
      () => {
        handlers.onChange();
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        handlers.onError?.("Realtime channel error");
      }
    });

  return {
    async unsubscribe() {
      await supabase.removeChannel(channel);
    },
  };
}

export type JobStatusChangeHandler = (status: string, row?: { metadata?: unknown }) => void;

/** Subscribe to status changes for a single job entry. Calls handler on each row update. */
export function subscribeJobStatusRealtime(
  supabase: SupabaseClient,
  jobId: string,
  onStatus: JobStatusChangeHandler,
): JobTrackerRealtimeSubscription {
  const channel: RealtimeChannel = supabase
    .channel(`job-status-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "job_tracker_entries",
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        const row = payload.new as { status?: string; metadata?: unknown };
        if (row.status) onStatus(row.status, row);
      },
    )
    .subscribe();

  return {
    async unsubscribe() {
      await supabase.removeChannel(channel);
    },
  };
}

export async function fetchJobTrackerRealtimeCredentials(
  tokenUrl: string,
  init?: { authorization?: string },
): Promise<{
  token: string;
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
} | null> {
  const headers: HeadersInit = {};
  if (init?.authorization) {
    headers.Authorization = init.authorization;
  }

  const response = await fetch(tokenUrl, {
    credentials: init?.authorization ? "omit" : "include",
    headers,
  });
  if (!response.ok) return null;

  const body = (await response.json()) as RealtimeTokenResponse;
  if (
    !body.success ||
    !body.token ||
    !body.userId ||
    !body.supabaseUrl ||
    !body.supabaseKey
  ) {
    return null;
  }

  return {
    token: body.token,
    userId: body.userId,
    supabaseUrl: body.supabaseUrl,
    supabaseKey: body.supabaseKey,
  };
}
