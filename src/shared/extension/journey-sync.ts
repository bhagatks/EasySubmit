import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { JourneyDisplay } from "@/src/shared/journey-display";
import { resolveJourneyDisplay } from "@/src/shared/journey-display";

export type JourneySnapshot = {
  saved: boolean;
  status?: string | null;
  id?: string | null;
  canReapply?: boolean;
};

export type JourneySyncTransition =
  | "unchanged"
  | "server_deleted"
  | "server_created"
  | "server_updated";

export function snapshotFromServerStatus(status: {
  saved: boolean;
  status?: string;
  id?: string;
  canReapply?: boolean;
}): JourneySnapshot {
  return {
    saved: Boolean(status.saved),
    status: status.status ?? null,
    id: typeof status.id === "string" ? status.id : null,
    canReapply: Boolean(status.canReapply),
  };
}

export function classifyJourneySyncTransition(
  previous: JourneySnapshot | null,
  next: JourneySnapshot,
): JourneySyncTransition {
  const prevSaved = Boolean(previous?.saved);
  const nextSaved = Boolean(next.saved);

  if (prevSaved && !nextSaved) return "server_deleted";
  if (!prevSaved && nextSaved) return "server_created";
  if (
    nextSaved &&
    (previous?.id !== next.id ||
      previous?.status !== next.status ||
      previous?.canReapply !== next.canReapply)
  ) {
    return "server_updated";
  }
  return "unchanged";
}

export function shouldResetExtensionAfterSync(transition: JourneySyncTransition): boolean {
  return transition === "server_deleted";
}

/** Stale pipeline errors must not block Stage 0 after dashboard delete. */
export function extensionShowsJourneyError(
  saveError: string | null | undefined,
  saved: boolean,
): boolean {
  return Boolean(saved && saveError?.trim());
}

export function resolveExtensionJourneyDisplay(input: {
  saved: boolean;
  status?: string | null;
  canReapply?: boolean;
  pipelineBusy: boolean;
  pipelineBusyLabel?: string | null;
  saveError?: string | null;
}): JourneyDisplay {
  if (input.canReapply) {
    return {
      stage: 0,
      label: "Re-apply",
      applyButtonState: "reapply",
      showResumeCard: false,
      showAssistCard: false,
    };
  }

  if (input.pipelineBusy) {
    return {
      stage: 1,
      label: input.pipelineBusyLabel ?? "Optimizing resume…",
      applyButtonState: "disabled",
      showResumeCard: false,
      showAssistCard: false,
    };
  }

  const status = input.saved ? ((input.status as JobTrackerStatus | undefined) ?? null) : null;
  return resolveJourneyDisplay(status, extensionShowsJourneyError(input.saveError, input.saved));
}

export function shouldRunExtensionJourneySyncPoll(saved: JourneySnapshot): boolean {
  return saved.saved;
}

export function extensionJourneySyncPollIntervalMs(status?: string | null): number {
  if (
    status === "CAPTURED" ||
    status === "RESUME_READY" ||
    status === "READY_TO_APPLY"
  ) {
    return 3_000;
  }
  if (status === "APPLIED") {
    return 5_000;
  }
  return 3_000;
}
