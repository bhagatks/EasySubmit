import { describe, expect, it } from "vitest";
import { BRAND } from "@/src/shared/brand";
import {
  classifyJourneySyncTransition,
  extensionShowsJourneyError,
  resolveExtensionJourneyDisplay,
  resolveExtensionSaveError,
  shouldResetExtensionAfterSync,
  snapshotFromServerStatus,
} from "@/src/shared/extension/journey-sync";

describe("journey-sync transitions", () => {
  it("detects dashboard delete as server_deleted", () => {
    const previous = snapshotFromServerStatus({
      saved: true,
      id: "entry-1",
      status: "READY_TO_APPLY",
    });
    const next = snapshotFromServerStatus({ saved: false });
    expect(classifyJourneySyncTransition(previous, next)).toBe("server_deleted");
    expect(shouldResetExtensionAfterSync("server_deleted")).toBe(true);
  });

  it("detects new save as server_created", () => {
    const next = snapshotFromServerStatus({
      saved: true,
      id: "entry-2",
      status: "CAPTURED",
    });
    expect(classifyJourneySyncTransition(null, next)).toBe("server_created");
  });

  it("detects status advance as server_updated", () => {
    const previous = snapshotFromServerStatus({
      saved: true,
      id: "entry-1",
      status: "CAPTURED",
    });
    const next = snapshotFromServerStatus({
      saved: true,
      id: "entry-1",
      status: "READY_TO_APPLY",
    });
    expect(classifyJourneySyncTransition(previous, next)).toBe("server_updated");
  });

  it("is unchanged when snapshot matches", () => {
    const snap = snapshotFromServerStatus({
      saved: true,
      id: "entry-1",
      status: "READY_TO_APPLY",
    });
    expect(classifyJourneySyncTransition(snap, snap)).toBe("unchanged");
  });
});

describe("extension journey display after delete", () => {
  it("does not show error stage when saveError is stale but row was deleted", () => {
    expect(extensionShowsJourneyError("Tailor failed", false)).toBe(false);
    const display = resolveExtensionJourneyDisplay({
      saved: false,
      saveError: "Tailor failed",
      pipelineBusy: false,
    });
    expect(display.stage).toBe(0);
    expect(display.label).toBe(BRAND.applyCta);
    expect(display.applyButtonState).toBe("hidden");
  });

  it("shows error stage while saved with pipeline failure", () => {
    const display = resolveExtensionJourneyDisplay({
      saved: true,
      status: "CAPTURED",
      saveError: "Tailor failed",
      pipelineBusy: false,
    });
    expect(display.stage).toBe("error");
    expect(display.label).toBe("Something went wrong");
  });

  it("matches READY_TO_APPLY stage from shared mapper", () => {
    const display = resolveExtensionJourneyDisplay({
      saved: true,
      status: "READY_TO_APPLY",
      pipelineBusy: false,
    });
    expect(display.stage).toBe(3);
    expect(display.statusLabel).toBe("");
    expect(display.showReviewRow).toBe(true);
    expect(display.showAssistCard).toBe(false);
  });
});

describe("resolveExtensionSaveError", () => {
  it("clears stale client Failed to fetch when server row is healthy", () => {
    expect(
      resolveExtensionSaveError({
        clientSaveError: "Failed to fetch",
        serverIssueMessage: null,
        saved: true,
        syncSucceeded: true,
      }),
    ).toBeNull();
  });

  it("prefers server issue message over stale client error", () => {
    expect(
      resolveExtensionSaveError({
        clientSaveError: "Failed to fetch",
        serverIssueMessage: "Tailor failed",
        saved: true,
        syncSucceeded: true,
      }),
    ).toBe("Tailor failed");
  });
});
