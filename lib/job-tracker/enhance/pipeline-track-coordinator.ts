/**
 * In-flight job + resume track promises keyed by job entry id.
 * Capture starts both; tailor awaits (or starts if missing).
 */

import { runJobAnalysisTrack } from "@/lib/job-tracker/enhance/run-job-analysis-track";
import { runResumePrepTrack } from "@/lib/job-tracker/enhance/run-resume-prep-track";
import type {
  JobAnalysisBundle,
  ResumePrepBundle,
  RunJobAnalysisTrackInput,
  RunResumePrepTrackInput,
} from "@/lib/job-tracker/enhance/pipeline-track-types";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

type TrackEntry = {
  job?: Promise<JobAnalysisBundle>;
  resume?: Promise<ResumePrepBundle>;
};

const tracks = new Map<string, TrackEntry>();

function entry(jobEntryId: string): TrackEntry {
  let row = tracks.get(jobEntryId);
  if (!row) {
    row = {};
    tracks.set(jobEntryId, row);
  }
  return row;
}

export function startJobAnalysisTrack(
  input: RunJobAnalysisTrackInput,
): Promise<JobAnalysisBundle> {
  const row = entry(input.jobEntryId);
  if (!row.job) {
    logEnhance("server", "tracks.job.start", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_JD_SKILLS,
      jobEntryId: input.jobEntryId,
    });
    row.job = runJobAnalysisTrack(input).catch((err) => {
      row.job = undefined;
      throw err;
    });
  }
  return row.job;
}

export function startResumePrepTrack(
  input: RunResumePrepTrackInput,
): Promise<ResumePrepBundle> {
  const row = entry(input.jobEntryId);
  if (!row.resume) {
    logEnhance("server", "tracks.resume.start", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_BRIEF_START,
      jobEntryId: input.jobEntryId,
    });
    row.resume = runResumePrepTrack(input).catch((err) => {
      row.resume = undefined;
      throw err;
    });
  }
  return row.resume;
}

/** Start both tracks in parallel (fire-and-forget safe). */
export function startPipelineTracks(input: {
  job: RunJobAnalysisTrackInput;
  resume: RunResumePrepTrackInput;
}): void {
  void startJobAnalysisTrack(input.job).catch(() => undefined);
  void startResumePrepTrack(input.resume).catch(() => undefined);
}

/** Await both tracks, starting any that are not already in flight. */
export async function awaitPipelineTracks(input: {
  job: RunJobAnalysisTrackInput;
  resume: RunResumePrepTrackInput;
}): Promise<{ job: JobAnalysisBundle; resume: ResumePrepBundle }> {
  const [job, resume] = await Promise.all([
    startJobAnalysisTrack(input.job),
    startResumePrepTrack(input.resume),
  ]);
  return { job, resume };
}

/** Drop in-flight promises after tailor completes (success or fail). */
export function clearPipelineTracks(jobEntryId: string): void {
  tracks.delete(jobEntryId);
}

/** @internal tests */
export function resetPipelineTracksForTests(): void {
  tracks.clear();
}
