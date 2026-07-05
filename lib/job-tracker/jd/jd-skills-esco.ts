import type { ExternalApiDebugExchange } from "@/lib/extension/external-api-debug";
import type { JdSkillEntry } from "@/lib/job-tracker/jd/jd-skills-types";
import {
  isKnownSkillToken,
  KEYWORD_STOP_WORDS,
} from "@/lib/job-tracker/jd/keyword-extract";
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
  /** Full JD text — used to reject ESCO hits unrelated to the posting. */
  jobDescription?: string;
};

function phraseContentTokens(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z0-9+#/]+/)
    .filter((token) => token.length >= 3 && !KEYWORD_STOP_WORDS.has(token));
}

const ESCO_JUNK_PATTERN =
  /\b(immigration|sponsorship|obtain\s+sponsorship|provide\s+immigration|job\s+descriptions?|blocking\s+notes?|visa\s+sponsorship)\b/i;

/** HR / legal boilerplate from JD disclaimers — never query ESCO for these. */
export function isEscoJunkPhrase(phrase: string): boolean {
  return ESCO_JUNK_PATTERN.test(phrase.trim());
}

/** Skip generic English / HR tokens that produce unrelated ESCO occupation skills. */
export function isEscoSearchPhrase(phrase: string): boolean {
  const trimmed = phrase.trim();
  if (trimmed.length < 3 || trimmed.length > 48) return false;
  if (isEscoJunkPhrase(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const token = words[0]!.toLowerCase();
    return (
      token.length >= 4 &&
      !KEYWORD_STOP_WORDS.has(token) &&
      (isKnownSkillToken(token) || MASTER_BY_LOWER.has(token))
    );
  }

  const content = phraseContentTokens(trimmed);
  return content.length >= 1 && content.some((token) => token.length >= 4);
}

/** Reject ESCO top hits that share no meaningful overlap with the query phrase. */
export function isEscoSkillRelevant(phrase: string, label: string): boolean {
  const labelKey = label.trim().toLowerCase();
  if (!labelKey) return false;
  if (isEscoJunkPhrase(label) || isEscoJunkPhrase(phrase)) return false;
  if (isKnownSkillToken(labelKey) || MASTER_BY_LOWER.has(labelKey)) return true;

  const phraseWords = phrase.trim().split(/\s+/).filter(Boolean);
  const phraseTokens = phraseContentTokens(phrase);
  if (phraseTokens.length === 0) return false;

  if (phraseWords.length === 1) {
    const token = phraseWords[0]!.toLowerCase();
    return (
      labelKey === token ||
      (isKnownSkillToken(token) && labelTokensInclude(labelKey, token))
    );
  }

  const labelTokens = labelKey.split(/[^a-z0-9+#/]+/).filter((t) => t.length >= 3);
  const substantiveOverlap = phraseTokens.filter((phraseToken) => phraseToken.length >= 4);
  if (substantiveOverlap.length === 0) return false;

  return substantiveOverlap.some((phraseToken) =>
    labelTokens.some(
      (labelToken) =>
        labelToken === phraseToken ||
        (phraseToken.length >= 4 &&
          (labelToken.includes(phraseToken) || phraseToken.includes(labelToken))),
    ),
  );
}

function labelTokensInclude(labelKey: string, token: string): boolean {
  return labelKey.split(/[^a-z0-9+#/]+/).some((part) => part === token);
}

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
    .filter(
      (p) =>
        isEscoSearchPhrase(p) &&
        p.length <= 48 &&
        !existingLower.has(p.toLowerCase()),
    )
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
      if (!isEscoSkillRelevant(phrase, entry.label)) continue;

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
