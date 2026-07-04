import type { SummaryIdentityResolution } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import {
  enforceSummaryWordBudget,
  repairSummaryOrphans,
  stripBannedSummaryWords,
} from "@/lib/resume/summary-rules";

/** Quantified spend / scope patterns often copied from JD text without experience proof. */
const UNGROUNDED_CLAIM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /\$\d+(?:\.\d+)?\s*[mbk]\b[^.!?]{0,80}(?:spend|purchases|spend|budget|spend)/gi,
    label: "spend figure",
  },
  {
    pattern: /\bmanaged\s+\$\d+(?:\.\d+)?\s*[mbk][^.!?]{0,60}(?:annual|direct|indirect)?[^.!?]*/gi,
    label: "managed spend",
  },
  {
    pattern: /\b\d+\+?\s*years?\s+in\s+procurement\b/gi,
    label: "procurement tenure",
  },
];

function experienceSupportsClaim(experienceBlob: string, sentence: string): boolean {
  const lower = experienceBlob.toLowerCase();
  const nums = sentence.match(/\$\d+(?:\.\d+)?\s*[mbk]/gi) ?? [];
  for (const num of nums) {
    if (!lower.includes(num.toLowerCase().replace(/\s/g, ""))) {
      const digits = num.replace(/[^\d.]/g, "");
      if (digits && !lower.includes(digits)) return false;
    }
  }

  if (/\bprocurement\b/i.test(sentence) && !/\bprocurement\b/i.test(lower)) {
    return false;
  }

  return true;
}

export function sanitizeUngroundedSummaryClaims(
  summary: string,
  experienceBlob: string,
): { summary: string; removed: string[] } {
  const removed: string[] = [];
  let out = summary.trim();
  if (!out) return { summary: out, removed };

  const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept: string[] = [];

  for (const sentence of sentences) {
    let drop = false;
    for (const { pattern, label } of UNGROUNDED_CLAIM_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(sentence) && !experienceSupportsClaim(experienceBlob, sentence)) {
        removed.push(label);
        drop = true;
        break;
      }
    }
    if (!drop) kept.push(sentence);
  }

  out = kept.join(" ").trim();
  return { summary: out, removed };
}

export function enforceSummaryIdentityOpening(
  summary: string,
  identity: SummaryIdentityResolution,
  experienceCompanies?: string[],
): string {
  const trimmed = summary.trim();
  if (!trimmed) return trimmed;

  const companies = new Set(
    (experienceCompanies ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean),
  );

  const withYears = trimmed.match(/^(.+?)\s+with\s+\d+/i);
  if (withYears?.[1]) {
    const opening = withYears[1].trim().replace(/\s+/g, " ");
    const openingLower = opening.toLowerCase();
    const jdLower = identity.jdTargetRole.toLowerCase();
    const identityLower = identity.identity.toLowerCase();

    const opensWithEmployer = companies.has(openingLower);
    const opensWithJdTitle =
      !identity.mayUseJdTitleInSummary && openingLower === jdLower;

    if (opensWithEmployer || opensWithJdTitle) {
      const rest = trimmed.slice(opening.length).trim();
      const lead = identity.identity;
      return `${lead}${rest.startsWith(",") || rest.startsWith(" with") ? "" : " "}${rest}`.trim();
    }
  }

  if (identity.mayUseJdTitleInSummary) return trimmed;

  const jdLower = identity.jdTargetRole.toLowerCase();
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith(jdLower)) return trimmed;

  const rest = trimmed.slice(identity.jdTargetRole.length).trim();
  const lead = identity.identity;
  return `${lead}${rest.startsWith(",") || rest.startsWith(" with") ? "" : " "}${rest}`.trim();
}

export function postProcessSummaryOutput(
  summary: string,
  input: {
    identity: SummaryIdentityResolution;
    experienceBlob: string;
    employerNames?: string[];
  },
): { summary: string; warnings: string[] } {
  const warnings: string[] = [];

  let out = stripBannedSummaryWords(summary);
  if (out.includes("[review]")) {
    warnings.push("Summary contained banned phrasing that could not be auto-fixed — please review.");
    out = out.replace(/\[review\]/gi, "").replace(/\s{2,}/g, " ").trim();
  }

  const grounded = sanitizeUngroundedSummaryClaims(out, input.experienceBlob);
  out = grounded.summary;
  if (grounded.removed.length > 0) {
    warnings.push(
      `Removed unverified claims from summary (${grounded.removed.join(", ")}).`,
    );
  }

  out = enforceSummaryIdentityOpening(out, input.identity, input.employerNames);

  out = repairSummaryOrphans(out);
  out = enforceSummaryWordBudget(out);

  if (input.identity.isCrossDomain) {
    warnings.push(
      "This job may not match your experience — summary keeps your professional identity.",
    );
  }

  return { summary: out, warnings };
}

export function experienceBlobFromForm(
  experience: Array<{ title?: string; company?: string; bullets?: string }>,
): string {
  return experience
    .map((e) => `${e.title ?? ""} ${e.company ?? ""} ${e.bullets ?? ""}`)
    .join("\n");
}

/** Fix duplicated Present in date strings and endYear fields. */
export function normalizePresentDateArtifacts(text: string): string {
  return text
    .replace(/\bPresent\s+Present\b/gi, "Present")
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[–-]\s*Present\s+Present\b/gi, (m) =>
      m.replace(/\s+Present$/i, ""),
    );
}

export function normalizeExperienceDateFields<
  T extends { endYear?: string; endMonth?: string; bullets?: string },
>(entries: T[]): T[] {
  return entries.map((entry) => {
    let endYear = entry.endYear ?? "";
    if (/present\s+present/i.test(endYear)) {
      endYear = "Present";
    }
    const bullets = entry.bullets
      ? normalizePresentDateArtifacts(entry.bullets)
      : entry.bullets;
    return { ...entry, endYear, bullets };
  });
}
