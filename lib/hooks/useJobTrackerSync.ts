"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import type { JobTrackerSummary } from "@/lib/job-tracker/types";
import {
  fetchJobTrackerRealtimeCredentials,
  subscribeJobTrackerRealtime,
} from "@/src/shared/extension/realtime-sync";

export const JOB_TRACKER_SYNC_POLL_FAST_MS = 3_000;
export const JOB_TRACKER_SYNC_POLL_SLOW_MS = 30_000;

export type JobTrackerEntriesResponse = {
  success: boolean;
  entries?: JobTrackerSummary[];
  autoArchiveAppliedJobs?: boolean;
  error?: string;
};

export function resolveJobTrackerPollIntervalMs(entries: JobTrackerSummary[]): number {
  const hasActiveJourney = entries.some(
    (entry) =>
      entry.status === "CAPTURED" ||
      entry.status === "RESUME_READY" ||
      entry.status === "READY_TO_APPLY",
  );
  return hasActiveJourney ? JOB_TRACKER_SYNC_POLL_FAST_MS : JOB_TRACKER_SYNC_POLL_SLOW_MS;
}

export type UseJobTrackerSyncOptions = {
  enabled?: boolean;
  onUpdate: (entries: JobTrackerSummary[]) => void;
  entriesUrl?: string;
  tokenUrl?: string;
};

async function fetchJobTrackerEntries(
  entriesUrl: string,
): Promise<JobTrackerSummary[]> {
  const response = await fetch(entriesUrl, { credentials: "include" });
  if (!response.ok) return [];

  const body = (await response.json()) as JobTrackerEntriesResponse;
  if (!body.success || !Array.isArray(body.entries)) return [];
  return body.entries;
}

/**
 * Keeps Job Tracker rows fresh: Supabase Realtime when configured, adaptive polling fallback.
 */
export function useJobTrackerSync({
  enabled = true,
  onUpdate,
  entriesUrl = "/api/job-tracker/entries",
  tokenUrl = "/api/job-tracker/realtime-token",
}: UseJobTrackerSyncOptions): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeRealtime: (() => Promise<void>) | null = null;

    const schedulePoll = (intervalMs: number) => {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(() => {
        void syncFromPoll();
      }, intervalMs);
    };

    const syncFromPoll = async () => {
      if (cancelled) return;
      const entries = await fetchJobTrackerEntries(entriesUrl);
      if (cancelled) return;
      onUpdateRef.current(entries);
      schedulePoll(resolveJobTrackerPollIntervalMs(entries));
    };

    // Realtime and poll share the same refresh path; polling backs up Realtime when unavailable.
    const syncFromRealtime = syncFromPoll;

    void syncFromPoll();

    void (async () => {
      const credentials = await fetchJobTrackerRealtimeCredentials(tokenUrl);
      if (cancelled || !credentials) return;

      const supabase = createClient(credentials.supabaseUrl, credentials.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      await supabase.realtime.setAuth(credentials.token);

      const subscription = subscribeJobTrackerRealtime(supabase, credentials.userId, {
        onChange: () => {
          void syncFromRealtime();
        },
      });

      unsubscribeRealtime = subscription.unsubscribe;
    })();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      void unsubscribeRealtime?.();
    };
  }, [enabled, entriesUrl, tokenUrl]);
}
