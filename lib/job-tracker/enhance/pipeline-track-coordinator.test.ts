import { describe, expect, it, vi } from "vitest";
import {
  awaitPipelineTracks,
  jobTrackInputsNeedRestart,
  resetPipelineTracksForTests,
  resumeTrackInputsNeedRestart,
  startJobAnalysisTrack,
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

    startPipelineTracks({ job: jobInput });

    const tracks = await awaitPipelineTracks({ job: jobInput, resume: resumeInput });

    expect(tracks.job).toEqual({ ok: "job" });
    expect(runJobAnalysisTrack).toHaveBeenCalledTimes(1);
    expect(runResumePrepTrack).toHaveBeenCalledTimes(1);
  });

  it("restarts job track when tailor supplies aiRoute after capture warm-start", async () => {
    resetPipelineTracksForTests();
    runJobAnalysisTrack.mockReset();
    runResumePrepTrack.mockReset();

    runJobAnalysisTrack
      .mockResolvedValueOnce({ ok: "warm" })
      .mockResolvedValueOnce({ ok: "with-route" });
    runResumePrepTrack.mockResolvedValue({ ok: "resume" });

    const baseJob = {
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
      form: { skillsText: "Python" } as import("@/lib/onboarding/hubResume").HubRefineryForm,
    };

    startPipelineTracks({ job: baseJob });

    const tracks = await awaitPipelineTracks({
      job: {
        ...baseJob,
        aiRoute: {
          mode: "system" as const,
          provider: "gemini" as const,
          modelId: "gemini-1.5-flash",
        },
      },
      resume: resumeInput,
    });

    expect(tracks.job).toEqual({ ok: "with-route" });
    expect(runJobAnalysisTrack).toHaveBeenCalledTimes(2);
  });
});

describe("pipeline track input reconciliation", () => {
  it("detects aiRoute arrival as restart signal", () => {
    const base = {
      userId: "u",
      jobEntryId: "j",
      jobDescription: "desc",
      targetRole: "Engineer",
      traceId: "t",
    };
    expect(jobTrackInputsNeedRestart(base, base)).toBe(false);
    expect(
      jobTrackInputsNeedRestart(base, {
        ...base,
        aiRoute: { mode: "system", provider: "gemini", modelId: "flash" },
      }),
    ).toBe(true);
  });

  it("detects tailor form as resume restart signal", () => {
    const base = {
      userId: "u",
      jobEntryId: "j",
      targetRole: "Engineer",
      traceId: "t",
    };
    expect(
      resumeTrackInputsNeedRestart(base, {
        ...base,
        form: { skillsText: "Python" } as import("@/lib/onboarding/hubResume").HubRefineryForm,
      }),
    ).toBe(true);
  });
});
