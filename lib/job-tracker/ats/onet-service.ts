/**
 * O*NET Web Services — free US Dept of Labor API for occupational vocabulary.
 *
 * Provides industry-standard skills, tasks, and technologies for a given role
 * even when they don't appear in the job description. This is what pushes ATS
 * scores from 70 → 85+ by covering implicit role expectations.
 *
 * API docs: https://services.onetcenter.org/
 * Auth: basic auth with username/password (free registration).
 * Rate limit: 25 req/sec, no daily cap.
 *
 * We use the keyword search endpoint to find the best occupation match,
 * then fetch skills and technology tools for that occupation.
 */

const ONET_BASE = "https://services.onetcenter.org/ws";

// Credentials from env — fall back to the public "guest" account (rate-limited).
function onetAuth(): string {
  const user = process.env.ONET_USERNAME ?? "guest";
  const pass = process.env.ONET_PASSWORD ?? "guest";
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

export type OnetRoleVocabulary = {
  /** Occupation title matched from O*NET (e.g. "Software Developers") */
  matchedTitle: string;
  /** Occupation code (SOC code) */
  onetCode: string;
  /** Core skills relevant to this occupation */
  skills: string[];
  /** Technology tools and platforms */
  tools: string[];
  /** Whether this came from cache or live API */
  source: "api" | "cache" | "fallback";
};

// ─── In-memory cache (per server process, ~1hr TTL) ──────────────────────────

const cache = new Map<string, { data: OnetRoleVocabulary; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Occupation search ────────────────────────────────────────────────────────

async function findOccupation(
  jobTitle: string,
): Promise<{ code: string; title: string } | null> {
  const url = `${ONET_BASE}/search?keyword=${encodeURIComponent(jobTitle)}&end=1`;
  const res = await fetch(url, {
    headers: { Authorization: onetAuth(), Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    occupation?: Array<{ code: string; title: string }>;
  };

  const occupation = data.occupation?.[0];
  if (!occupation) return null;

  return { code: occupation.code, title: occupation.title };
}

// ─── Skills fetch ─────────────────────────────────────────────────────────────

async function fetchOccupationSkills(onetCode: string): Promise<string[]> {
  const url = `${ONET_BASE}/occupations/${onetCode}/summary/skills`;
  const res = await fetch(url, {
    headers: { Authorization: onetAuth(), Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    element?: Array<{ name: string; score?: { value: number } }>;
  };

  return (data.element ?? [])
    .filter((s) => (s.score?.value ?? 0) >= 3.5) // only "important" skills
    .map((s) => s.name)
    .slice(0, 20);
}

// ─── Technology tools fetch ───────────────────────────────────────────────────

async function fetchOccupationTools(onetCode: string): Promise<string[]> {
  const url = `${ONET_BASE}/occupations/${onetCode}/summary/technology_skills`;
  const res = await fetch(url, {
    headers: { Authorization: onetAuth(), Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    category?: Array<{ title: { name: string }; example?: Array<{ name: string }> }>;
  };

  const tools: string[] = [];
  for (const cat of data.category ?? []) {
    for (const ex of cat.example ?? []) {
      tools.push(ex.name);
    }
  }
  return tools.slice(0, 30);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch industry-standard vocabulary for a job title from O*NET.
 * Returns empty fallback on any network or parse error — never throws.
 */
export async function fetchRoleVocabulary(
  jobTitle: string,
): Promise<OnetRoleVocabulary> {
  const cacheKey = jobTitle.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, source: "cache" };
  }

  try {
    const occupation = await findOccupation(jobTitle);
    if (!occupation) {
      return emptyVocabulary(jobTitle);
    }

    const [skills, tools] = await Promise.all([
      fetchOccupationSkills(occupation.code),
      fetchOccupationTools(occupation.code),
    ]);

    const result: OnetRoleVocabulary = {
      matchedTitle: occupation.title,
      onetCode: occupation.code,
      skills,
      tools,
      source: "api",
    };

    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    return emptyVocabulary(jobTitle);
  }
}

function emptyVocabulary(jobTitle: string): OnetRoleVocabulary {
  return {
    matchedTitle: jobTitle,
    onetCode: "",
    skills: [],
    tools: [],
    source: "fallback",
  };
}
