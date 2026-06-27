import type { JdSkillEntry } from "@/lib/job-tracker/jd/jd-skills-types";
import { isKnownSkillToken } from "@/lib/job-tracker/jd/keyword-extract";
import { MASTER_SKILLS } from "@/src/lib/constants/skills";

const ESCO_BASE =
  process.env.ESCO_API_BASE?.replace(/\/$/, "") ??
  "https://ec.europa.eu/esco/api";

const MASTER_BY_LOWER = new Map(
  MASTER_SKILLS.map((s) => [s.toLowerCase(), s] as const),
);

type EscoSearchHit = {
  uri?: string;
  title?: string;
  preferredLabel?: { en?: string };
};

/** ESCO REST search — enriches unmatched JD phrases (free, optional). */
export async function enrichJdSkillsWithEsco(
  phrases: string[],
  existing: JdSkillEntry[],
): Promise<JdSkillEntry[]> {
  if (process.env.ESCO_API_ENABLED === "false") return [];

  const existingLower = new Set(existing.map((e) => e.label.toLowerCase()));
  const enriched: JdSkillEntry[] = [];

  const candidates = phrases
    .map((p) => p.trim())
    .filter((p) => p.length >= 3 && p.length <= 48 && !existingLower.has(p.toLowerCase()))
    .slice(0, 8);

  for (const phrase of candidates) {
    try {
      const url = `${ESCO_BASE}/resource/skill?language=en&text=${encodeURIComponent(phrase)}&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;

      const data = (await res.json()) as {
        _embedded?: { results?: EscoSearchHit[] };
      };
      const hit = data._embedded?.results?.[0];
      const label =
        hit?.preferredLabel?.en ?? hit?.title ?? phrase;
      const key = label.toLowerCase();
      if (existingLower.has(key)) continue;

      existingLower.add(key);
      enriched.push({
        label: MASTER_BY_LOWER.get(key) ?? label,
        normalized: MASTER_BY_LOWER.get(key),
        source: "esco",
        confidence: isKnownSkillToken(key) ? 0.85 : 0.65,
        escoUri: hit?.uri,
      });
    } catch {
      // skip failed phrase
    }
  }

  return enriched;
}
