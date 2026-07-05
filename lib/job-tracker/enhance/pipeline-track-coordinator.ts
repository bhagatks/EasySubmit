/**
 * In-flight job + resume track promises keyed by job entry id.
 * Capture may warm-start the job track; tailor awaits (or starts if missing).
 */

import { createHash } from "crypto";
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
  jobInput?: RunJobAnalysisTrackInput;
  resume?: Promise<ResumePrepBundle>;
  resumeInput?: RunResumePrepTrackInput;
};

const tracks = new Map<string, TrackEntry>();

function hashJobDescription(description: string): string {
  return createHash("sha1")
    .update(description.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

function entry(jobEntryId: string): TrackEntry {
  let row = tracks.get(jobEntryId);
  if (!row) {
    row = {};
    tracks.set(jobEntryId, row);
  }
  return row;
}

function routeSignature(
  route: RunJobAnalysisTrackInput["aiRoute"] | undefined,
): string | null {
  if (!route) return null;
  return `${route.mode}:${route.modelId}`;
}

/** Restart job track when tailor supplies AI route or JD inputs that differ from warm-start. */
export function jobTrackInputsNeedRestart(
  prev: RunJobAnalysisTrackInput,
  next: RunJobAnalysisTrackInput,
): boolean {
  const prevJd = hashJobDescription(prev.jobDescription ?? "");
  const nextJd = hashJobDescription(next.jobDescription ?? "");
  if (prevJd !== nextJd) return true;
  if (prev.targetRole !== next.targetRole) return true;
  if (!prev.aiRoute && next.aiRoute) return true;
  if (routeSignature(prev.aiRoute) !== routeSignature(next.aiRoute)) return true;
  return false;
}

/** Restart resume track when tailor supplies form/profile inputs missing at warm-start. */
export function resumeTrackInputsNeedRestart(
  prev: RunResumePrepTrackInput,
  next: RunResumePrepTrackInput,
): boolean {
  if (next.form && !prev.form) return true;
  if (next.form && prev.form && next.form !== prev.form) return true;
  if ((next.profileTargetTitle ?? "") !== (prev.profileTargetTitle ?? "")) return true;
  if ((next.sourceProfileId ?? "") !== (prev.sourceProfileId ?? "")) return true;
  return false;
}

function logTrackDone(
  kind: "job" | "resume",
  input: { traceId: string; userId: string; jobEntryId: string },
): void {
  logEnhance("server", `tracks.${kind}.done`, {
    traceId: input.traceId,
    userId: input.userId,
    step: kind === "job" ? ENHANCE_PIPELINE.PRE_JD_SKILLS : ENHANCE_PIPELINE.PRE_BRIEF_START,
    jobEntryId: input.jobEntryId,
  });
}

function logTrackFail(
  kind: "job" | "resume",
  input: { traceId: string; userId: string; jobEntryId: string },
  err: unknown,
): void {
  logEnhance("server", `tracks.${kind}.fail`, {
    traceId: input.traceId,
    userId: input.userId,
    step: kind === "job" ? ENHANCE_PIPELINE.PRE_JD_SKILLS : ENHANCE_PIPELINE.PRE_BRIEF_START,
    jobEntryId: input.jobEntryId,
    error: err instanceof Error ? err.message : String(err),
  });
}

function wrapTrack<T>(
  kind: "job" | "resume",
  input: { traceId: string; userId: string; jobEntryId: string },
  promise: Promise<T>,
): Promise<T> {
  return promise
    .then((result) => {
      logTrackDone(kind, input);
      return result;
    })
    .catch((err) => {
      logTrackFail(kind, input, err);
      throw err;
    });
}

export function startJobAnalysisTrack(
  input: RunJobAnalysisTrackInput,
): Promise<JobAnalysisBundle> {
  const row = entry(input.jobEntryId);
  if (row.job && row.jobInput && jobTrackInputsNeedRestart(row.jobInput, input)) {
    row.job = undefined;
    row.jobInput = undefined;
  }

  if (!row.job) {
    logEnhance("server", "tracks.job.start", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_JD_SKILLS,
      jobEntryId: input.jobEntryId,
    });
    row.jobInput = input;
    row.job = wrapTrack("job", input, runJobAnalysisTrack(input)).catch((err) => {
      row.job = undefined;
      row.jobInput = undefined;
      throw err;
    });
  }
  return row.job;
}

export function startResumePrepTrack(
  input: RunResumePrepTrackInput,
): Promise<ResumePrepBundle> {
  const row = entry(input.jobEntryId);
  if (row.resume && row.resumeInput && resumeTrackInputsNeedRestart(row.resumeInput, input)) {
    row.resume = undefined;
    row.resumeInput = undefined;
  }

  if (!row.resume) {
    logEnhance("server", "tracks.resume.start", {
      traceId: input.traceId,
      userId: input.userId,
      step: ENHANCE_PIPELINE.PRE_BRIEF_START,
      jobEntryId: input.jobEntryId,
    });
    row.resumeInput = input;
    row.resume = wrapTrack("resume", input, runResumePrepTrack(input)).catch((err) => {
      row.resume = undefined;
      row.resumeInput = undefined;
      throw err;
    });
  }
  return row.resume;
}

/** Start job track warm-up (capture). Resume track waits until tailor has form. */
export function startPipelineTracks(input: {
  job: RunJobAnalysisTrackInput;
  resume?: RunResumePrepTrackInput;
}): void {
  void startJobAnalysisTrack(input.job).catch((err) => {
    logTrackFail("job", input.job, err);
  });
  if (input.resume) {
    void startResumePrepTrack(input.resume).catch((err) => {
      logTrackFail("resume", input.resume!, err);
    });
  }
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
