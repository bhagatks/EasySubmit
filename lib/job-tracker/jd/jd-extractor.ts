// Layer 3A — Deterministic JD extraction. Always runs, zero cost, zero latency.
// Extracts: seniority, scope, domain, years experience, tiered keywords, skills.
// Never throws.

import type {
  JDSegments,
  JDIntelligence,
  JDSeniority,
  JDScope,
  JDDomain,
} from "@/lib/job-tracker/jd/jd-intelligence";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { extractNlpKeywordsForSection } from "@/lib/job-tracker/jd/jd-nlp-extractor";

// ─── Seniority detection ──────────────────────────────────────────────────────

const SENIORITY_TITLE_MAP: Array<[RegExp, JDSeniority]> = [
  [/\b(?:chief|cto|cpo|cso|svp|evp)\b/i, "exec"],
  [/\bvp\b|\bvice\s+president/i, "vp"],
  [/\bdirector/i, "director"],
  [/\bstaff\s+(?:engineer|developer|swe)/i, "staff"],
  [/\bprincipal\s+(?:engineer|developer|swe|scientist)/i, "principal"],
  [/\bsenior\b|\bsr\b\.?\s+(?:software|engineer|developer|swe|manager)/i, "senior"],
  [/\bjunior\b|\bjr\b\.?\s+(?:software|engineer|developer)/i, "entry"],
  [/\bentry[- ]level\b|\bnew\s+grad\b|\bintern\b/i, "entry"],
  [/\blead\s+(?:engineer|developer|swe|architect)/i, "lead"],
  [/\b(?:engineering|software|technical|product)\s+manager\b/i, "manager"],
  [/\bmanager\b/i, "manager"],
];

const YEARS_SENIOR_RE =
  /(?:8|9|10|11|12|\d{2})\+?\s+years/i;
const YEARS_STAFF_RE =
  /(?:10|11|12|13|14|15|\d{2})\+?\s+years/i;

export function detectSeniority(title: string, requirements: string): JDSeniority {
  const combined = `${title} ${requirements}`;
  for (const [pattern, level] of SENIORITY_TITLE_MAP) {
    if (pattern.test(combined)) return level;
  }
  // Fallback: infer from years experience
  if (YEARS_STAFF_RE.test(requirements)) return "staff";
  if (YEARS_SENIOR_RE.test(requirements)) return "senior";
  // Default
  return "mid";
}

// ─── Scope detection ──────────────────────────────────────────────────────────

export function detectScope(title: string, responsibilities: string): JDScope {
  const combined = `${title} ${responsibilities}`.toLowerCase();
  const hasManager = /\b(?:manage|managing|mentor|mentoring|hire|hiring|performance\s+review|direct\s+report|team\s+of\s+\d+|people\s+manager|engineering\s+manager)\b/.test(combined);
  const hasIc = /\b(?:individual\s+contributor|ic\b|no\s+direct\s+reports?)\b/.test(combined);
  const titleIsManager = /\bmanager\b|\bdirector\b|\bvp\b|\blead\b/i.test(title);

  if (hasManager && titleIsManager) return "manager";
  if (hasManager) return "hybrid";
  if (hasIc) return "ic";
  if (titleIsManager && /\blead\b/i.test(title)) return "lead";
  if (titleIsManager) return "manager";
  return "ic";
}

// ─── Domain detection ─────────────────────────────────────────────────────────

const DOMAIN_SIGNALS: Array<[RegExp, JDDomain]> = [
  [/\b(?:procurement|strategic\s+sourcing|category\s+management|purchase[- ]to[- ]pay|p2p\s+process|indirect\s+procurement|direct\s+procurement|supplier\s+(?:relationship|management|performance))\b/i, "procurement-supply-chain"],
  [/\b(?:medical\s+device|medtech|biotech|pharma|iso\s+13485|fda\s+regulations?|cardiac\s+health)\b/i, "medtech-regulatory"],
  [/\b(?:machine\s+learning|ml\s+engineer|deep\s+learning|llm|ai\s+engineer|nlp|computer\s+vision)\b/i, "ml-ai"],
  [/\b(?:data\s+engineer|etl|data\s+pipeline|spark|airflow|kafka|dbt|data\s+warehouse)\b/i, "data-engineering"],
  [/\b(?:data\s+scientist|data\s+science|statistical\s+model|r\s+programming|jupyter)\b/i, "data-science"],
  [/\b(?:devops|sre|site\s+reliability|platform\s+engineer|infrastructure|kubernetes|terraform|ci\/cd|observability)\b/i, "devops-sre"],
  [/\b(?:frontend|front[- ]end|react|vue|angular|next\.?js|css|html|ui\s+engineer)\b/i, "frontend"],
  [/\b(?:backend|back[- ]end|api\s+engineer|server[- ]side|microservice|database\s+engineer)\b/i, "backend"],
  [/\b(?:mobile|ios|android|react\s+native|flutter|swift|kotlin)\b/i, "mobile"],
  [/\b(?:security\s+engineer|appsec|penetration\s+test|soc|siem|compliance\s+engineer|devsecops)\b/i, "security"],
  [/\b(?:qa\s+engineer|quality\s+assurance|sdet|test\s+automation|testing\s+engineer)\b/i, "qa-testing"],
  [/\b(?:product\s+manager|pm\s+role|product\s+lead|product\s+owner)\b/i, "product-management"],
  [/\b(?:fullstack|full[- ]stack|full\s+stack)\b/i, "fullstack"],
];

export function detectDomain(title: string, allText: string): JDDomain {
  const combined = `${title} ${allText}`.toLowerCase();
  for (const [pattern, domain] of DOMAIN_SIGNALS) {
    if (pattern.test(combined)) return domain;
  }
  // If title just says "Software Engineer" broadly
  if (/\b(?:software\s+engineer|swe|developer|programmer)\b/i.test(title)) {
    return "software-engineering";
  }
  return "other";
}

// ─── Years experience extraction ──────────────────────────────────────────────

const YEARS_PATTERNS = [
  /(\d+)\+?\s+years?\s+of\s+(?:relevant\s+)?(?:professional\s+)?experience/i,
  /(\d+)\+?\s+years?\s+(?:of\s+)?(?:hands-on\s+)?(?:working\s+)?experience/i,
  /(?:minimum|at\s+least)\s+(\d+)\+?\s+years?/i,
  /(\d+)[–-](\d+)\s+years?\s+of/i,
];

export function extractYearsExp(requirements: string): number | null {
  for (const pattern of YEARS_PATTERNS) {
    const match = requirements.match(pattern);
    if (match) {
      const num = parseInt(match[1]!, 10);
      if (!isNaN(num) && num > 0 && num <= 30) return num;
    }
  }
  return null;
}

// ─── Tiered keyword extraction ────────────────────────────────────────────────

export function extractTieredKeywords(segments: JDSegments): {
  tier1: string[];
  tier2: string[];
  tier3: string[];
} {
  return {
    tier1: extractNlpKeywordsForSection(segments.requirements).slice(0, 30),
    tier2: extractNlpKeywordsForSection(segments.responsibilities).slice(0, 25),
    tier3: extractNlpKeywordsForSection(segments.preferred).slice(0, 20),
  };
}

// ─── Skills extraction ────────────────────────────────────────────────────────

// ─── Degree extraction ────────────────────────────────────────────────────────

const DEGREE_RE =
  /(?:bs|b\.s\.|ba|b\.a\.|bsc|ms|m\.s\.|msc|phd|ph\.d\.|bachelor(?:'s)?|master(?:'s)?|doctorate)\s*(?:degree\s+)?(?:in\s+([a-zA-Z\s,]{3,40}))?/i;

function extractDegree(requirements: string): string | null {
  const match = requirements.match(DEGREE_RE);
  if (!match) return null;
  const raw = match[0]?.trim() ?? "";
  if (raw.length > 3) return raw.slice(0, 80);
  return null;
}

// ─── Certs extraction ─────────────────────────────────────────────────────────

const CERT_PATTERNS = [
  /aws\s+certified[^\n,]{0,40}/gi,
  /google\s+(?:cloud\s+)?(?:professional|associate)[^\n,]{0,40}/gi,
  /azure\s+(?:certified|certification)[^\n,]{0,40}/gi,
  /ckad?|cks\b/gi,
  /pmp\b/gi,
  /cissp|cism|cisa\b/gi,
  /comptia\s+\w+/gi,
  /itil\s+(?:v\d+|foundation)?/gi,
];

function extractCerts(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of CERT_PATTERNS) {
    const matches = text.match(pattern) ?? [];
    for (const m of matches) {
      found.add(m.trim().toLowerCase());
    }
  }
  return Array.from(found);
}

// ─── Job title extraction ─────────────────────────────────────────────────────

// Looks for a title in the first 400 chars of the context/intro section.
// Matches "Position Summary\n<Title>" or just the first line that looks like a role name.
const JOB_TITLE_PATTERNS = [
  /(?:position|job|role)\s+(?:title|summary)[:\-\s]+([A-Z][^\n\r,.]{5,80})/i,
  /^([A-Z][a-zA-Z &,\-|/]{8,70})[\r\n]/m,
];

export function extractJobTitle(contextText: string, targetRoleFallback: string): string | null {
  const trimmed = contextText.slice(0, 600).trim();
  for (const pattern of JOB_TITLE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].trim().replace(/\s+/g, " ");
      // Reject if too generic or matches the user's own target role
      if (
        candidate.length > 6 &&
        candidate.length < 80 &&
        !/^(the|this|our|a |an |job|role|position|we |you )/i.test(candidate) &&
        candidate.toLowerCase() !== targetRoleFallback.toLowerCase()
      ) {
        return candidate;
      }
    }
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function extractJDIntelligenceSync(
  segments: JDSegments,
  targetRole: string,
): JDIntelligence {
  try {
    const allText = [
      segments.requirements,
      segments.responsibilities,
      segments.preferred,
      segments.context,
    ].join(" ");

    const seniority = detectSeniority(targetRole, segments.requirements);
    const scope = detectScope(targetRole, segments.responsibilities);
    const domain = detectDomain(targetRole, allText);
    const mustHaveYearsExp = extractYearsExp(segments.requirements);
    const mustHaveDegree = extractDegree(segments.requirements);
    const mustHaveCerts = extractCerts(segments.requirements);
    const preferredCerts = extractCerts(segments.preferred);

    const mustHaveSkills = [
      ...new Set(extractNlpKeywordsForSection(segments.requirements)),
    ];

    const preferredSkills = [
      ...new Set(extractNlpKeywordsForSection(segments.preferred)),
    ];

    const { tier1, tier2, tier3 } = extractTieredKeywords(segments);

    // Determine confidence: higher when we found more structured signals
    const signals = [
      mustHaveSkills.length > 0,
      tier1.length > 0,
      mustHaveYearsExp !== null,
      seniority !== "mid",
      scope !== "ic",
    ].filter(Boolean).length;
    const confidence = Math.min(signals / 5, 0.7); // max 0.7 for deterministic

    const extractedJobTitle = extractJobTitle(segments.context, targetRole);

    return {
      ...makeEmptyIntelligence(),
      extractedJobTitle,
      mustHaveSkills,
      mustHaveYearsExp,
      mustHaveDegree,
      mustHaveCerts: [...new Set([...mustHaveCerts, ...preferredCerts])],
      preferredSkills,
      seniority,
      scope,
      domain,
      tier1Keywords: tier1,
      tier2Keywords: tier2,
      tier3Keywords: tier3,
      source: "deterministic",
      confidence,
      extractedAt: new Date().toISOString(),
    };
  } catch {
    return makeEmptyIntelligence();
  }
}
