import type { JdSkillEntry } from "@/lib/job-tracker/jd/jd-skills-types";

/** Optional ESCOX sidecar — POST JD text, returns ESCO URIs. Off unless ESCOX_URL set. */
export async function extractJdSkillsWithEscox(
  jobDescription: string,
): Promise<JdSkillEntry[]> {
  const baseUrl = process.env.ESCOX_URL?.replace(/\/$/, "");
  if (!baseUrl || process.env.ESCOX_ENABLED !== "true") return [];

  try {
    const res = await fetch(`${baseUrl}/extract-skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([jobDescription.slice(0, 12000)]),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const uris = (await res.json()) as string[][];
    const first = uris[0] ?? [];
    return first.slice(0, 25).map((uri, idx) => ({
      label: uri.split("/").pop()?.replace(/-/g, " ") ?? `Skill ${idx + 1}`,
      source: "escox" as const,
      confidence: 0.75,
      escoUri: uri,
    }));
  } catch {
    return [];
  }
}
