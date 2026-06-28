import { describe, expect, it, vi } from "vitest";
import { pollJobStatusUntil } from "./pipeline-status-poll";

describe("pollJobStatusUntil", () => {
  it("returns immediately when status is already terminal", async () => {
    const fetchStatus = vi.fn().mockResolvedValue({
      saved: true,
      status: "READY_TO_APPLY",
      id: "entry-1",
    });

    const result = await pollJobStatusUntil({ fetchStatus, intervalMs: 10, maxMs: 100 });

    expect(result.ok).toBe(true);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it("polls until status becomes terminal", async () => {
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({ saved: true, status: "CAPTURED" })
      .mockResolvedValueOnce({ saved: true, status: "RESUME_READY" })
      .mockResolvedValueOnce({ saved: true, status: "READY_TO_APPLY" });

    const result = await pollJobStatusUntil({
      fetchStatus,
      intervalMs: 5,
      maxMs: 200,
      isDone: (snapshot) => snapshot.status === "READY_TO_APPLY",
    });

    expect(result.ok).toBe(true);
    expect(fetchStatus.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("times out when status never advances", async () => {
    const fetchStatus = vi.fn().mockResolvedValue({ saved: true, status: "CAPTURED" });

    const result = await pollJobStatusUntil({
      fetchStatus,
      intervalMs: 5,
      maxMs: 20,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("timeout");
    }
  });
});
