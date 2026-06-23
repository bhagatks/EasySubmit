// Public API for the JD Brain pipeline.
// analyzeJobDescription — async, runs AI enrichment if no cache hit.
// analyzeJobDescriptionSync — sync, deterministic floor only, never blocks on AI.
// Both guarantee a complete JDAnalysisResult — never throw, never return null.

import { createHash } from "crypto";
import { cleanJobDescription } from "@/lib/job-tracker/jd/jd-cleaner";
import { segmentJobDescription } from "@/lib/job-tracker/jd/jd-segmenter";
import { extractJDIntelligenceSync } from "@/lib/job-tracker/jd/jd-extractor";
import type {
  JDIntelligence,
  JDSegments,
  JSONLDJobFields,
} from "@/lib/job-tracker/jd/jd-intelligence";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";

export type JDAnalysisInput = {
  rawDescription: string;
  targetRole: string;
  jsonLdFields?: JSONLDJobFields;
  cachedIntelligence?: JDIntelligence | null;
  cachedHash?: string | null;
  useAi?: boolean;
};

export type JDAnalysisResult = {
  segments: JDSegments;
  intelligence: JDIntelligence;
  cacheHit: boolean;
  descriptionHash: string;
};

export function hashJobDescription(description: string): string {
  return createHash("sha1")
    .update(description.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

function buildSegmentsForEmpty(): JDSegments {
  return {
    requirements: "",
    responsibilities: "",
    preferred: "",
    context: "",
    source: "full-text",
    wordCount: { requirements: 0, responsibilities: 0, preferred: 0 },
  };
}

export function analyzeJobDescriptionSync(
  rawDescription: string,
  targetRole: string,
  jsonLdFields?: JSONLDJobFields,
): JDAnalysisResult {
  try {
    const descriptionHash = hashJobDescription(rawDescription);

    if (!rawDescription.trim()) {
      return {
        segments: buildSegmentsForEmpty(),
        intelligence: makeEmptyIntelligence(),
        cacheHit: false,
        descriptionHash,
      };
    }

    const { cleaned } = cleanJobDescription(rawDescription);
    const segments = segmentJobDescription(cleaned, jsonLdFields);
    const intelligence = extractJDIntelligenceSync(segments, targetRole);

    return { segments, intelligence, cacheHit: false, descriptionHash };
  } catch {
    return {
      segments: buildSegmentsForEmpty(),
      intelligence: makeEmptyIntelligence(),
      cacheHit: false,
      descriptionHash: hashJobDescription(rawDescription),
    };
  }
}

export async function analyzeJobDescription(
  input: JDAnalysisInput,
): Promise<JDAnalysisResult> {
  try {
    const {
      rawDescription,
      targetRole,
      jsonLdFields,
      cachedIntelligence,
      cachedHash,
      useAi = true,
    } = input;

    const descriptionHash = hashJobDescription(rawDescription);

    // Cache hit: hash matches and we have stored intelligence
    if (cachedHash === descriptionHash && cachedIntelligence) {
      const { cleaned } = cleanJobDescription(rawDescription);
      const segments = segmentJobDescription(cleaned, jsonLdFields);
      return { segments, intelligence: cachedIntelligence, cacheHit: true, descriptionHash };
    }

    if (!rawDescription.trim()) {
      return {
        segments: buildSegmentsForEmpty(),
        intelligence: makeEmptyIntelligence(),
        cacheHit: false,
        descriptionHash,
      };
    }

    // Run deterministic extraction (always)
    const { cleaned } = cleanJobDescription(rawDescription);
    const segments = segmentJobDescription(cleaned, jsonLdFields);
    let intelligence = extractJDIntelligenceSync(segments, targetRole);

    // Run AI enrichment if enabled and system AI is available.
    // Dynamic import keeps the prisma/system-key-pool chain out of the sync module graph.
    if (useAi) {
      const { extractJDIntelligenceWithAI, mergeAIIntoIntelligence } = await import(
        "@/lib/job-tracker/jd/jd-ai-extractor"
      );
      const aiResult = await extractJDIntelligenceWithAI(segments, targetRole, intelligence);
      if (aiResult.ok) {
        intelligence = mergeAIIntoIntelligence(intelligence, aiResult.intelligence);
      }
    }

    return { segments, intelligence, cacheHit: false, descriptionHash };
  } catch {
    return {
      segments: buildSegmentsForEmpty(),
      intelligence: makeEmptyIntelligence(),
      cacheHit: false,
      descriptionHash: hashJobDescription(input.rawDescription),
    };
  }
}
