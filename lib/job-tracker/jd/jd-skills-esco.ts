import type { ExternalApiDebugExchange } from "@/lib/extension/external-api-debug";
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
  preferredLabel?: Record<string, string | undefined>;
};

type EscoSearchResponse = {
  _embedded?: { results?: EscoSearchHit[] };
};

/** ESCO searchGet — full-text skill search (see ec.europa.eu/esco/api/doc/esco_api_doc.html). */
export function buildEscoSkillSearchUrl(baseUrl: string, phrase: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    text: phrase,
    language: "en",
    type: "skill",
    limit: "1",
  });
  return `${base}/search?${params.toString()}`;
}

export function escoSearchHitLabel(hit: EscoSearchHit, fallback: string): string {
  const labels = hit.preferredLabel;
  if (labels) {
    return labels.en ?? labels["en-us"] ?? hit.title ?? fallback;
  }
  return hit.title ?? fallback;
}

export function jdSkillFromEscoSearchHit(
  hit: EscoSearchHit,
  phrase: string,
): JdSkillEntry | null {
  const label = escoSearchHitLabel(hit, phrase).trim();
  if (!label) return null;

  const key = label.toLowerCase();
  return {
    label: MASTER_BY_LOWER.get(key) ?? label,
    normalized: MASTER_BY_LOWER.get(key),
    source: "esco",
    confidence: isKnownSkillToken(key) ? 0.85 : 0.65,
    escoUri: hit.uri,
  };
}

export type EnrichJdSkillsWithEscoOptions = {
  /** When set, records each live HTTP call (skipped when ESCO disabled). */
  apiDebug?: ExternalApiDebugExchange[];
};

/** ESCO REST search — enriches unmatched JD phrases (free, optional). */
export async function enrichJdSkillsWithEsco(
  phrases: string[],
  existing: JdSkillEntry[],
  options: EnrichJdSkillsWithEscoOptions = {},
): Promise<JdSkillEntry[]> {
  if (process.env.ESCO_API_ENABLED === "false") return [];

  const { apiDebug } = options;

  const existingLower = new Set(existing.map((e) => e.label.toLowerCase()));
  const enriched: JdSkillEntry[] = [];

  const candidates = phrases
    .map((p) => p.trim())
    .filter((p) => p.length >= 3 && p.length <= 48 && !existingLower.has(p.toLowerCase()))
    .slice(0, 8);

  for (const phrase of candidates) {
    const url = buildEscoSkillSearchUrl(ESCO_BASE, phrase);
    const label = `ESCO search: ${phrase}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = { parseError: true };
      }

      apiDebug?.push({
        label,
        request: { method: "GET", url },
        response: {
          status: res.status,
          ok: res.ok,
          body: data,
        },
      });

      if (!res.ok) continue;

      const hit = (data as EscoSearchResponse)?._embedded?.results?.[0];
      if (!hit) continue;

      const entry = jdSkillFromEscoSearchHit(hit, phrase);
      if (!entry) continue;

      const key = entry.label.toLowerCase();
      if (existingLower.has(key)) continue;

      existingLower.add(key);
      enriched.push(entry);
    } catch (error) {
      apiDebug?.push({
        label,
        request: { method: "GET", url },
        response: {
          status: null,
          ok: false,
          error: error instanceof Error ? error.message : "Network error",
        },
      });
    }
  }

  return enriched;
}
