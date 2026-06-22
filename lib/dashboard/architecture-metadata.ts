export type ArchitectureApplication = {
  role: string;
  company: string;
  status: string;
  score?: number;
  when?: string;
};

/** @deprecated Legacy JSON embedded in `profiles.content` — use `JobTrackerEntry` table instead. */

export type ArchitectureMetadata = {
  parseIntegrity?: number;
  keywordMatch?: number;
  recruiterReadability?: number;
  resumesGenerated?: number;
  calibrationScores?: number[];
  applications?: ArchitectureApplication[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readPercent(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  return undefined;
}

function readApplications(value: unknown): ArchitectureApplication[] {
  if (!Array.isArray(value)) return [];

  const results: ArchitectureApplication[] = [];

  for (const entry of value) {
    const row = asRecord(entry);
    if (!row) continue;

    const role = typeof row.role === "string" ? row.role : "";
    const company = typeof row.company === "string" ? row.company : "";
    if (!role || !company) continue;

    results.push({
      role,
      company,
      status: typeof row.status === "string" ? row.status : "Applied",
      score: readPercent(row.score ?? row.atsScore),
      when: typeof row.when === "string" ? row.when : undefined,
    });
  }

  return results;
}

/** Parse Career Architecture JSONB metadata for dashboard widgets. */
export function parseArchitectureMetadata(content: unknown): ArchitectureMetadata {
  const root = asRecord(content);
  if (!root) return {};

  const metadata = asRecord(root.metadata) ?? root;
  const fromRoot = readApplications(root.applications);
  const applications =
    fromRoot.length > 0 ? fromRoot : readApplications(metadata.applications);

  const calibrationScores = Array.isArray(metadata.calibrationScores)
    ? metadata.calibrationScores
        .filter((score): score is number => typeof score === "number" && Number.isFinite(score))
        .map((score) => Math.round(score))
    : undefined;

  return {
    parseIntegrity: readPercent(metadata.parseIntegrity),
    keywordMatch: readPercent(metadata.keywordMatch),
    recruiterReadability: readPercent(metadata.recruiterReadability),
    resumesGenerated:
      typeof metadata.resumesGenerated === "number" && Number.isFinite(metadata.resumesGenerated)
        ? Math.max(0, Math.floor(metadata.resumesGenerated))
        : undefined,
    calibrationScores,
    applications: applications.length > 0 ? applications : undefined,
  };
}

export function averageCalibrationScores(
  columnScore: number | null | undefined,
  metadata: ArchitectureMetadata,
): number | null {
  const scores: number[] = [];

  if (typeof columnScore === "number" && columnScore > 0) {
    scores.push(columnScore);
  }

  for (const score of metadata.calibrationScores ?? []) {
    if (score > 0) scores.push(score);
  }

  if (scores.length === 0) return null;

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function countApplicationsSent(applications: ArchitectureApplication[]): number {
  return applications.filter((application) => application.status.toLowerCase() !== "draft").length;
}
