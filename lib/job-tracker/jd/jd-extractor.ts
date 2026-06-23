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
  [/\b(?:machine\s+learning|ml\s+engineer|deep\s+learning|llm|ai\s+engineer|nlp|computer\s+vision)\b/i, "ml-ai"],
  [/\b(?:data\s+engineer|etl|pipeline|spark|airflow|kafka|dbt|warehouse|dbt)\b/i, "data-engineering"],
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

// Stop words — HR filler, plain English, and company/context noise that must not appear in skills
const STOP_WORDS = new Set([
  // Articles / conjunctions / prepositions
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","as","is","was","are","were","be","been","have","has","had",
  "do","does","did","will","would","could","should","may","might","can",
  "this","that","these","those","it","its","we","our","you","your","they",
  "their","not","no","so","if","then","than","when","where","who","which",
  "what","how","all","each","every","both","more","most","other","some",
  "into","about","after","before","through","also","just","only","very",
  // Generic HR / job-posting filler
  "work","working","use","using","make","ensure","support","including",
  "position","role","opportunity","candidate","apply","application","hiring",
  "join","compensation","benefits","pay","salary","culture","innovation",
  "environment","team","company","organization","business","experience",
  "skill","ability","knowledge","required","preferred","plus","bonus",
  "ideal","strong","excellent","great","key","core","related","relevant",
  // Retail / supply-chain / generic ops words that bleed in from non-tech JDs
  "walmart","target","amazon","store","stores","associate","associates",
  "customer","customers","service","services","product","products",
  "planning","plan","plans","planned","planner",
  "scheduling","schedule","schedules","scheduled",
  "workforce","workers","worker","staff","staffing",
  "leave","absence","absences","attendance","vacation","pto",
  "compliance","compliant","regulatory","regulation","regulations",
  "area","areas","region","regions","location","locations","site","sites",
  "degree","degrees","education","bachelor","master","phd",
  "qualifications","qualification","qualified","qualify",
  "execution","executing","execute","executes",
  "strategies","strategy","strategic","tactics","tactic",
  "analytical","analysis","analyze","analyses",
  "attention","focus","focused","detail","details",
  "problem","problems","solving","solver","solution","solutions",
  "people","person","persons","individuals","individual",
  "communication","communicate","communicates","interpersonal",
  "leadership","leader","leaders","lead","leading","management","managing",
  "time","times","timely","deadline","deadlines","priorities","priority",
  "process","processes","procedure","procedures",
  "data","information","reporting","reports","report","metrics","metric",
  "develop","developing","development","developer","building","build",
  "drive","driving","driven","impact","results","result","outcome","outcomes",
  "collaborate","collaboration","collaborative","cross","functional",
  "proactive","initiative","ownership","accountability","accountable",
  "innovative","creativity","creative","critical","thinking",
]);

// Taxonomy of known tech/professional skills for deterministic classification
const KNOWN_SKILLS = new Set([
  // Languages
  "python","java","javascript","typescript","go","golang","rust","swift","kotlin",
  "c","cplusplus","csharp","dotnet","scala","ruby","php","r","matlab","julia",
  // Frontend
  "react","vue","angular","nextjs","svelte","html","css","tailwind","webpack",
  "vite","storybook","redux","zustand","graphql",
  // Backend
  "nodejs","express","fastapi","django","flask","spring","rails","nestjs","grpc",
  "rest","microservices","kafka","rabbitmq","celery",
  // Infrastructure
  "aws","gcp","azure","docker","kubernetes","terraform","ansible","jenkins",
  "github","gitlab","ci","cd","linux","bash","nginx","helm","prometheus","grafana",
  "datadog","splunk","pagerduty","newrelic",
  // Data
  "sql","postgresql","mysql","mongodb","redis","elasticsearch","cassandra",
  "dynamodb","snowflake","bigquery","spark","hadoop","airflow","dbt","pandas",
  "numpy","pytorch","tensorflow","sklearn","jupyter","tableau","powerbi",
  // Cloud services
  "lambda","s3","ec2","rds","sqs","sns","cloudwatch","cloudfront","eks","ecs",
  // Testing
  "jest","pytest","junit","cypress","playwright","selenium","vitest",
  // Architecture
  "microservices","distributed","serverless","event-driven","soa",
  // Processes
  "agile","scrum","kanban","devops","sre","tdd","bdd","ci/cd",
  // Certs
  "aws-certified","gcp-certified","cka","ckad","pmp","cissp",
]);

function tokenizeSection(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\bnode\.js\b/gi, "nodejs")
    .replace(/\bvue\.js\b/gi, "vuejs")
    .replace(/\breact\.js\b/gi, "reactjs")
    .replace(/\bnext\.js\b/gi, "nextjs")
    .replace(/\b\.net\b/gi, "dotnet")
    .replace(/\bc\+\+/gi, "cplusplus")
    .replace(/\bc#/gi, "csharp")
    .replace(/\bci\/cd\b/gi, "ci/cd")
    .split(/[^a-z0-9#+/\-]/)
    .map((t) => t.replace(/^[-]+|[-]+$/g, ""))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

// Returns true for tokens that look like a genuine tech/professional term:
// must contain a digit, uppercase letter, slash, dot, or be a known skill.
// Pure lowercase dictionary words (e.g. "planning", "area", "attention") are excluded.
function looksLikeTechTerm(token: string): boolean {
  if (KNOWN_SKILLS.has(token)) return true;
  // Contains a digit (versions, acronyms with numbers)
  if (/\d/.test(token)) return true;
  // Contains / or # or + (e.g. c#, c++, ci/cd, s3)
  if (/[#+/]/.test(token)) return true;
  // Hyphenated compound (e.g. event-driven, full-stack, open-source)
  if (/-/.test(token) && token.length >= 6) return true;
  // Short known acronyms (2-4 uppercase-equivalent chars that are not stop words)
  if (token.length <= 4) return KNOWN_SKILLS.has(token);
  return false;
}

function bigramsOf(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return result;
}

function extractKeywordsFromText(text: string, maxTerms: number): string[] {
  if (!text.trim()) return [];
  const tokens = tokenizeSection(text);
  const bigrams = bigramsOf(tokens);
  const freq = new Map<string, number>();
  for (const t of [...tokens, ...bigrams]) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  // Only include known skills or terms that look like tech/professional terms.
  // This prevents plain English words (company names, HR jargon) from leaking into skill keywords.
  const candidates = Array.from(freq.entries())
    .filter(([kw]) => looksLikeTechTerm(kw))
    .sort((a, b) => {
      const aKnown = KNOWN_SKILLS.has(a[0]) ? 1 : 0;
      const bKnown = KNOWN_SKILLS.has(b[0]) ? 1 : 0;
      if (bKnown !== aKnown) return bKnown - aKnown;
      return b[1] - a[1];
    })
    .slice(0, maxTerms)
    .map(([kw]) => kw);

  return candidates;
}

export function extractTieredKeywords(segments: JDSegments): {
  tier1: string[];
  tier2: string[];
  tier3: string[];
} {
  return {
    tier1: extractKeywordsFromText(segments.requirements, 30),
    tier2: extractKeywordsFromText(segments.responsibilities, 25),
    tier3: extractKeywordsFromText(segments.preferred, 20),
  };
}

// ─── Skills extraction ────────────────────────────────────────────────────────

function extractSkillsFromText(text: string): string[] {
  const tokens = tokenizeSection(text);
  return tokens.filter((t) => KNOWN_SKILLS.has(t));
}

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
      ...new Set([
        ...extractSkillsFromText(segments.requirements),
      ]),
    ];

    const preferredSkills = [
      ...new Set([
        ...extractSkillsFromText(segments.preferred),
      ]),
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

    return {
      ...makeEmptyIntelligence(),
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
