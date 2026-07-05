import { describe, expect, it } from "vitest";
import {
  countSummarySentences,
  countSummaryWords,
  enforceSummaryWordBudget,
  findBannedWords,
  normalizeSummaryForReadiness,
  trimSummaryWordsPreservingSentences,
  splitSummarySentences,
  stripBannedSummaryWords,
  validateSummary,
} from "@/lib/resume/summary-rules";

const VALID_SUMMARY =
  "Senior platform engineer with nine years building cloud-native systems for high-traffic SaaS products across regulated industries worldwide. " +
  "Designs resilient services using TypeScript, Kubernetes, Terraform, and observability tooling deployed on AWS and GCP infrastructure at scale. " +
  "Specializes in API reliability, cost optimization, and cross-team delivery for distributed platform teams supporting enterprise customers daily. " +
  "Reduced incident volume 35% while supporting 12 million monthly active users across three product lines and mentoring six engineers.";

describe("countSummaryWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countSummaryWords("one two three")).toBe(3);
    expect(countSummaryWords("  one   two  ")).toBe(2);
  });
});

describe("countSummarySentences", () => {
  it("counts four terminated sentences", () => {
    expect(countSummarySentences(VALID_SUMMARY)).toBe(4);
  });

  it("returns zero for empty text", () => {
    expect(countSummarySentences("   ")).toBe(0);
  });
});

describe("findBannedWords", () => {
  it("finds banned phrases case-insensitively", () => {
    expect(findBannedWords("A passionate leader who will leverage synergy.")).toEqual(
      expect.arrayContaining(["passionate", "leverage", "synergy"]),
    );
    expect(findBannedWords("A passionate leader who will leverage synergy.")).toHaveLength(3);
  });
});

describe("validateSummary", () => {
  it("passes a compliant summary", () => {
    const result = validateSummary(VALID_SUMMARY);
    expect(result.sentenceError).toBeNull();
    expect(result.wordCount).toBeGreaterThanOrEqual(70);
    expect(result.wordCount).toBeLessThanOrEqual(80);
    expect(result.bannedWords).toEqual([]);
  });

  it("reports sentence and word errors", () => {
    const result = validateSummary("Too short.");
    expect(result.sentenceError).toBe("Summary must be exactly 4 sentences.");
    expect(result.wordError).toMatch(/currently 2 words/);
  });
});

describe("stripBannedSummaryWords", () => {
  it("replaces leverage inflections without leaving stray letters", () => {
    expect(stripBannedSummaryWords("Leverages strategic sourcing for growth.")).toBe(
      "applies strategic sourcing for growth.",
    );
  });

  it("removes passionate and replaces utilize", () => {
    expect(stripBannedSummaryWords("A passionate engineer who will utilize APIs.")).toBe(
      "A engineer who will uses APIs.",
    );
  });

  it("drops sentences with multi-word banned phrases and repairs orphans", () => {
    const input =
      "Leader with 21 years of platform experience. Proven track record in leading cross-functional teams through migration.";
    const out = stripBannedSummaryWords(input);
    expect(out.toLowerCase()).not.toContain("proven track record");
    expect(out).toMatch(/Leading cross-functional teams/i);
  });
});

describe("enforceSummaryWordBudget", () => {
  it("trims summaries over 80 words", () => {
    const words = Array.from({ length: 84 }, (_, i) => `word${i}`).join(" ");
    const trimmed = enforceSummaryWordBudget(`${words}.`);
    expect(countSummaryWords(trimmed)).toBeLessThanOrEqual(80);
  });
});

describe("normalizeSummaryForReadiness", () => {
  it("pads short summaries toward four sentences using source text", () => {
    const source = VALID_SUMMARY;
    const out = normalizeSummaryForReadiness("Engineering leader with twenty-one years.", {
      sourceSummary: source,
    });
    expect(countSummarySentences(out)).toBe(4);
    expect(countSummaryWords(out)).toBeGreaterThanOrEqual(70);
    expect(validateSummary(out).sentenceError).toBeNull();
  });

  it("trims overlong summaries to the word budget", () => {
    const out = normalizeSummaryForReadiness(VALID_SUMMARY);
    expect(countSummaryWords(out)).toBeLessThanOrEqual(80);
    expect(countSummarySentences(out)).toBeLessThanOrEqual(4);
  });

  it("keeps four sentences when trimming word count over 80", () => {
    const sentences = [
      "Platform engineering leader with twenty-one years of experience building large-scale distributed systems for global retail and healthcare organizations across North America and Europe.",
      "Expert in cloud architecture, API design, microservices modernization, and cross-functional team leadership spanning mobile, web, and data engineering disciplines in complex enterprise environments.",
      "Delivered modernization programs that reduced integration latency, improved reliability metrics, and accelerated product delivery cadence for applications serving millions of daily active users worldwide.",
      "Combines strategic planning with hands-on technical guidance for distributed engineering organizations navigating legacy migration, cloud-native transformation, and platform reliability initiatives.",
    ];
    expect(countSummaryWords(sentences.join(" "))).toBeGreaterThan(80);

    const out = trimSummaryWordsPreservingSentences(sentences, 80, 70);
    expect(countSummarySentences(out)).toBe(4);
    expect(countSummaryWords(out)).toBeLessThanOrEqual(80);
    expect(countSummaryWords(out)).toBeGreaterThanOrEqual(70);
  });
});
