import { describe, expect, it, vi } from "vitest";
import {
  awaitPipelineTracks,
  resetPipelineTracksForTests,
  startPipelineTracks,
} from "@/lib/job-tracker/enhance/pipeline-track-coordinator";

const runJobAnalysisTrack = vi.fn();
const runResumePrepTrack = vi.fn();

vi.mock("@/lib/job-tracker/enhance/run-job-analysis-track", () => ({
  runJobAnalysisTrack: (...args: unknown[]) => runJobAnalysisTrack(...args),
}));

vi.mock("@/lib/job-tracker/enhance/run-resume-prep-track", () => ({
  runResumePrepTrack: (...args: unknown[]) => runResumePrepTrack(...args),
}));

describe("pipeline-track-coordinator", () => {
  it("dedupes job track when capture registers before tailor awaits", async () => {
    resetPipelineTracksForTests();
    runJobAnalysisTrack.mockReset();
    runResumePrepTrack.mockReset();

    runJobAnalysisTrack.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: "job" }), 20)),
    );
    runResumePrepTrack.mockResolvedValue({ ok: "resume" });

    const jobInput = {
      userId: "user-1",
      jobEntryId: "job-1",
      jobDescription: "Python engineer",
      targetRole: "Engineer",
      traceId: "trace-1",
    };
    const resumeInput = {
      userId: "user-1",
      jobEntryId: "job-1",
      targetRole: "Engineer",
      traceId: "trace-1",
    };

    startPipelineTracks({ job: jobInput, resume: resumeInput });

    const tracks = await awaitPipelineTracks({ job: jobInput, resume: resumeInput });

    expect(tracks.job).toEqual({ ok: "job" });
    expect(runJobAnalysisTrack).toHaveBeenCalledTimes(1);
    expect(runResumePrepTrack).toHaveBeenCalledTimes(1);
  });
});
