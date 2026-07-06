/**
 * O*NET Web Services v2 — US Dept of Labor occupational vocabulary.
 *
 * API docs: https://services.onetcenter.org/reference/start/overview
 * Samples: https://github.com/onetcenter/web-services-v2-samples
 */

import type {
  ExternalApiDebugExchange,
  FetchRoleVocabularyOptions,
} from "@/lib/extension/external-api-debug";

const ONET_BASE = "https://api-v2.onetcenter.org";

export type { FetchRoleVocabularyOptions };

function onetApiKey(): string | null {
  const key = process.env.ONET_API_KEY?.trim();
  return key || null;
}

export type OnetRoleVocabulary = {
  matchedTitle: string;
  onetCode: string;
  skills: string[];
  tools: string[];
  source: "api" | "cache" | "fallback";
};

const cache = new Map<string, { data: OnetRoleVocabulary; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

const ONET_REQUEST_HEADERS = {
  Accept: "application/json",
  "X-API-Key": "[redacted]",
} as const;

async function onetJsonFetch(
  path: string,
  query: Record<string, string | number>,
  label: string,
  apiDebug?: ExternalApiDebugExchange[],
): Promise<{ ok: boolean; status: number; data: unknown } | null> {
  const apiKey = onetApiKey();
  if (!apiKey) return null;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }
  const url = `${ONET_BASE}/${path}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
        "User-Agent": "EasySubmit-onet-service/1.0",
      },
      signal: AbortSignal.timeout(4000),
    });

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = { parseError: true };
    }

    apiDebug?.push({
      label,
      request: { method: "GET", url, headers: { ...ONET_REQUEST_HEADERS } },
      response: { status: res.status, ok: res.ok, body: data },
    });

    if (!res.ok) return null;
    if (data && typeof data === "object" && "error" in data) return null;
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    apiDebug?.push({
      label,
      request: { method: "GET", url, headers: { ...ONET_REQUEST_HEADERS } },
      response: {
        status: null,
        ok: false,
        error: error instanceof Error ? error.message : "Network error",
      },
    });
    return null;
  }
}

async function findOccupation(
  jobTitle: string,
  apiDebug?: ExternalApiDebugExchange[],
): Promise<{ code: string; title: string } | null> {
  const fetched = await onetJsonFetch(
    "online/search",
    { keyword: jobTitle, end: 1 },
    "Occupation search",
    apiDebug,
  );
  if (!fetched) return null;

  const data = fetched.data as {
    occupation?: Array<{ code: string; title: string }>;
  };
  const occupation = data.occupation?.[0];
  if (!occupation) return null;
  return { code: occupation.code, title: occupation.title };
}

async function fetchOccupationSkills(
  onetCode: string,
  apiDebug?: ExternalApiDebugExchange[],
): Promise<string[]> {
  const fetched = await onetJsonFetch(
    `online/occupations/${encodeURIComponent(onetCode)}/summary/skills`,
    {},
    "Occupation skills",
    apiDebug,
  );
  if (!fetched) return [];

  const data = fetched.data as {
    element?: Array<{ name: string; score?: { value: number } }>;
  };

  return (data.element ?? [])
    .filter((s) => {
      const score = s.score?.value;
      return score == null || score >= 3.5;
    })
    .map((s) => s.name)
    .filter((name): name is string => Boolean(name?.trim()))
    .slice(0, 20);
}

async function fetchOccupationTools(
  onetCode: string,
  apiDebug?: ExternalApiDebugExchange[],
): Promise<string[]> {
  const fetched = await onetJsonFetch(
    `online/occupations/${encodeURIComponent(onetCode)}/summary/technology_skills`,
    {},
    "Occupation tools",
    apiDebug,
  );
  if (!fetched) return [];

  const data = fetched.data as {
    category?: Array<{
      title?: string | { name: string };
      example?: Array<{ name?: string; title?: string }>;
    }>;
  };

  const tools: string[] = [];
  for (const cat of data.category ?? []) {
    for (const ex of cat.example ?? []) {
      const label = (ex.title ?? ex.name ?? "").trim();
      if (label) tools.push(label);
    }
  }
  return tools.slice(0, 30);
}

/** Fetch industry-standard vocabulary for a job title from O*NET. Never throws. */
export async function fetchRoleVocabulary(
  jobTitle: string,
  options?: FetchRoleVocabularyOptions,
): Promise<OnetRoleVocabulary> {
  const cacheKey = jobTitle.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, source: "cache" };
  }

  const apiDebug = options?.apiDebug;

  if (!onetApiKey()) {
    return emptyVocabulary(jobTitle);
  }

  try {
    const occupation = await findOccupation(jobTitle, apiDebug);
    if (!occupation) {
      return emptyVocabulary(jobTitle);
    }

    const [skills, tools] = await Promise.all([
      fetchOccupationSkills(occupation.code, apiDebug),
      fetchOccupationTools(occupation.code, apiDebug),
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

export type OnetVocabularyPipelineOutcome = {
  status: "done" | "warning";
  detail: string;
};

/** Pipeline debug status — optional step: warning when O*NET data is missing, not error. */
export function resolveOnetVocabularyPipelineOutcome(
  vocab: OnetRoleVocabulary,
  apiDebug?: ExternalApiDebugExchange[],
): OnetVocabularyPipelineOutcome {
  if (vocab.source === "api" || vocab.source === "cache") {
    return {
      status: "done",
      detail: vocab.matchedTitle,
    };
  }

  const failedExchange = apiDebug?.find(
    (exchange) => exchange.response.status !== null && !exchange.response.ok,
  );
  const httpStatus = failedExchange?.response.status;
  if (httpStatus === 401) {
    return {
      status: "warning",
      detail: "O*NET auth failed (401) — check ONET_API_KEY",
    };
  }
  if (httpStatus != null) {
    return {
      status: "warning",
      detail: `O*NET request failed (${httpStatus})`,
    };
  }

  if (!onetApiKey()) {
    return {
      status: "warning",
      detail: "O*NET API key not configured (ONET_API_KEY)",
    };
  }

  if (!vocab.onetCode) {
    return {
      status: "warning",
      detail: `No O*NET occupation match for "${vocab.matchedTitle}"`,
    };
  }

  return {
    status: "warning",
    detail: "O*NET vocabulary unavailable",
  };
}
