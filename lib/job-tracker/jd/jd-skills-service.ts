import { hashJobDescription } from "@/lib/job-tracker/jd/jd-brain";
import { extractDeterministicJdSkills } from "@/lib/job-tracker/jd/jd-skills-deterministic";
import { enrichJdSkillsWithEsco } from "@/lib/job-tracker/jd/jd-skills-esco";
import { extractJdSkillsWithEscox } from "@/lib/job-tracker/jd/jd-skills-escox";
import type {
  FetchJdSkillsInput,
  JdSkillEntry,
  JdSkillsVocabulary,
} from "@/lib/job-tracker/jd/jd-skills-types";
import { emptyJdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import { tokenizeJobText } from "@/lib/job-tracker/jd/keyword-extract";

const cache = new Map<string, { data: JdSkillsVocabulary; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function mergeSkillEntries(base: JdSkillEntry[], extra: JdSkillEntry[]): JdSkillEntry[] {
  const seen = new Set(base.map((e) => e.label.toLowerCase()));
  const merged = [...base];
  for (const entry of extra) {
    const key = entry.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged.sort((a, b) => b.confidence - a.confidence);
}

function dedupePhrasesForEsco(jd: string): string[] {
  const tokens = tokenizeJobText(jd);
  const phrases: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return [...new Set([...tokens.filter((t) => t.length >= 4), ...phrases])];
}

/**
 * JD Skills Framework — posting-specific skill vocabulary.
 * Never throws; falls back to deterministic-only extraction.
 */
export async function fetchJdSkillsVocabulary(
  input: FetchJdSkillsInput,
): Promise<JdSkillsVocabulary> {
  const descriptionHash = hashJobDescription(input.jobDescription);

  if (
    input.cachedHash === descriptionHash &&
    input.cachedVocabulary &&
    input.cachedVocabulary.skills.length > 0
  ) {
    return { ...input.cachedVocabulary, source: "cache" };
  }

  const memCached = cache.get(descriptionHash);
  if (memCached && memCached.expiresAt > Date.now()) {
    return { ...memCached.data, source: "cache" };
  }

  const trimmed = input.jobDescription.trim();
  if (!trimmed) {
    return emptyJdSkillsVocabulary(descriptionHash);
  }

  try {
    const targetRole = input.targetRole ?? input.jobTitle ?? "Professional";
    const providersUsed: JdSkillsVocabulary["providersUsed"] = ["deterministic"];

    let skills = extractDeterministicJdSkills({
      jobDescription: trimmed,
      targetRole,
      jobTitle: input.jobTitle,
    });

    if (input.useExternalExtract !== false) {
      const escoExtra = await enrichJdSkillsWithEsco(
        dedupePhrasesForEsco(trimmed),
        skills,
        { apiDebug: input.apiDebug },
      );
      if (escoExtra.length > 0) {
        providersUsed.push("esco");
        skills = mergeSkillEntries(skills, escoExtra);
      }

      const escoxExtra = await extractJdSkillsWithEscox(trimmed);
      if (escoxExtra.length > 0) {
        providersUsed.push("escox");
        skills = mergeSkillEntries(skills, escoxExtra);
      }
    }

    const result: JdSkillsVocabulary = {
      skills: skills.slice(0, 40),
      descriptionHash,
      source: "api",
      providersUsed,
    };

    cache.set(descriptionHash, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch {
    return emptyJdSkillsVocabulary(descriptionHash);
  }
}

/** Labels ranked for Group 1 skills merge. */
export function jdSkillLabels(vocab: JdSkillsVocabulary): string[] {
  return vocab.skills.map((s) => s.label);
}
