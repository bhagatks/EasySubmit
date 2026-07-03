export type JdSkillSource = "deterministic" | "esco" | "escox" | "keyword_gap";

export type JdSkillEntry = {
  label: string;
  normalized?: string;
  source: JdSkillSource;
  confidence: number;
  tier?: 1 | 2 | 3;
  escoUri?: string;
};

export type JdSkillsVocabulary = {
  skills: JdSkillEntry[];
  occupationHint?: string;
  descriptionHash: string;
  source: "api" | "cache" | "fallback";
  providersUsed: Array<"deterministic" | "esco" | "escox">;
};

import type { ExternalApiDebugExchange } from "@/lib/extension/external-api-debug";

export type FetchJdSkillsInput = {
  jobDescription: string;
  jobTitle?: string;
  targetRole?: string;
  cachedVocabulary?: JdSkillsVocabulary | null;
  cachedHash?: string | null;
  useExternalExtract?: boolean;
  /** When set, records live ESCO HTTP exchanges (skipped on cache hit). */
  apiDebug?: ExternalApiDebugExchange[];
};

export function emptyJdSkillsVocabulary(descriptionHash: string): JdSkillsVocabulary {
  return {
    skills: [],
    descriptionHash,
    source: "fallback",
    providersUsed: ["deterministic"],
  };
}
