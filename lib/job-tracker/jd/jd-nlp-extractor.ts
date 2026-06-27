/**
 * Server-only NLP keyword extraction for JD Brain (RAKE phrases + wink POS filter).
 * Do not import from client components.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const rake = require("rake-js").default ?? require("rake-js");
const winkNLP = require("wink-nlp");
const model = require("wink-eng-lite-web-model");
import { MASTER_SKILLS } from "@/src/lib/constants/skills";
import { KEYWORD_STOP_WORDS } from "@/lib/job-tracker/jd/keyword-extract";
import type { JDSegments } from "@/lib/job-tracker/jd/jd-intelligence";

const MASTER_SKILLS_SET = new Set(MASTER_SKILLS.map((skill) => skill.toLowerCase()));

const nlp = winkNLP(model);
const its = nlp.its;

const KEEP_POS = new Set(["NOUN", "PROPN", "SYM"]);

const MASTER_SKILL_BY_LOWER = new Map(
  MASTER_SKILLS.map((skill) => [skill.toLowerCase(), skill] as const),
);

function normalizePhrase(phrase: string): string {
  return phrase.trim().replace(/\s+/g, " ");
}

function canonicalSkill(label: string): string {
  return MASTER_SKILL_BY_LOWER.get(label.toLowerCase()) ?? label;
}

function phrasePosTags(phrase: string): string[] {
  const doc = nlp.readDoc(phrase);
  return doc
    .tokens()
    .filter((token: { out: (prop: unknown) => string }) => {
      const type = token.out(its.type);
      return type === "word" || type === "number";
    })
    .out(its.pos);
}

function passesPosFilter(phrase: string): boolean {
  const lower = phrase.toLowerCase();
  if (MASTER_SKILLS_SET.has(lower)) return true;

  const tags = phrasePosTags(phrase);
  if (tags.length === 0) return false;
  if (tags.some((tag) => tag === "VERB" || tag === "AUX")) return false;

  return tags.every((tag) => KEEP_POS.has(tag));
}

function isCleanMultiWordPhrase(phrase: string): boolean {
  const normalized = normalizePhrase(phrase).toLowerCase();
  const words = normalized.split(/\s+/);
  if (words.length < 2) return false;
  if (/[#+/\-]|\d/.test(normalized)) return true;
  return words.some((word) => MASTER_SKILLS_SET.has(word));
}

function isStructuralTechToken(token: string): boolean {
  const lower = token.toLowerCase();
  if (MASTER_SKILLS_SET.has(lower)) return true;
  if (/\d/.test(lower)) return true;
  if (/[#+/]/.test(lower)) return true;
  return lower.includes("-") && lower.length >= 4;
}

function extractMasterSkillHits(text: string): string[] {
  const doc = nlp.readDoc(text);
  const values = doc
    .tokens()
    .filter((token: { out: (prop: unknown) => string }) => {
      const type = token.out(its.type);
      return type === "word" || type === "number";
    })
    .out(its.value);

  const hits = new Set<string>();

  for (let i = 0; i < values.length; i += 1) {
    const unigram = values[i]!.toLowerCase();
    if (MASTER_SKILLS_SET.has(unigram)) {
      hits.add(canonicalSkill(unigram));
    }

    if (i < values.length - 1) {
      const bigram = `${values[i]} ${values[i + 1]}`.toLowerCase();
      if (MASTER_SKILLS_SET.has(bigram)) {
        hits.add(canonicalSkill(bigram));
      }
    }
  }

  const ciCd = text.match(/\bci\s*\/\s*cd\b/i);
  if (ciCd && MASTER_SKILLS_SET.has("ci/cd")) {
    hits.add("CI/CD");
  }

  return Array.from(hits);
}

function extractNlpKeywordsFromText(text: string): string[] {
  if (!text.trim()) return [];

  const seen = new Set<string>();
  const ranked: string[] = [];

  const addPhrase = (raw: string) => {
    const phrase = normalizePhrase(raw);
    const lower = phrase.toLowerCase();
    if (!phrase || lower.length < 2) return;
    if (KEYWORD_STOP_WORDS.has(lower)) return;
    if (seen.has(lower)) return;

    const canonical = canonicalSkill(phrase);
    const canonicalLower = canonical.toLowerCase();

    if (MASTER_SKILLS_SET.has(canonicalLower)) {
      seen.add(canonicalLower);
      ranked.push(canonicalLower);
      return;
    }

    const wordCount = phrase.split(/\s+/).length;
    if (!passesPosFilter(phrase)) return;
    if (wordCount === 1 && !isStructuralTechToken(phrase)) return;
    if (wordCount >= 2 && !isCleanMultiWordPhrase(phrase)) return;

    seen.add(lower);
    ranked.push(phrase);
  };

  for (const skill of extractMasterSkillHits(text)) {
    addPhrase(skill.toLowerCase());
  }

  const rakePhrases = rake(text, { language: "english" }) as string[];
  for (const phrase of rakePhrases) {
    addPhrase(phrase);
  }

  return ranked;
}

/** RAKE + POS-filtered keywords from JD requirements and responsibilities. */
export function extractNlpKeywords(segments: JDSegments): string[] {
  const text = [segments.requirements, segments.responsibilities].filter(Boolean).join("\n\n");
  return extractNlpKeywordsFromText(text);
}

export function extractNlpKeywordsForSection(text: string): string[] {
  return extractNlpKeywordsFromText(text);
}
