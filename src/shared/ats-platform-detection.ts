/**
 * Canonical ATS platform detection — single source of truth for URL patterns and name aliases.
 * Consumed by extension fingerprint (`ats-fingerprint.ts`) and job-tracker rules (`platform-rules.ts`).
 */

export type AtsPlatform =
  | "linkedin"
  | "indeed"
  | "greenhouse"
  | "workday"
  | "lever"
  | "ashby"
  | "smartrecruiters"
  | "icims"
  | "taleo"
  | "jobvite"
  | "successfactors"
  | "workable"
  | "bamboohr"
  | "adp"
  | "rippling"
  | "jazzhr"
  | "paylocity"
  | "paycom"
  | "clearcompany"
  | "teamtailor"
  | "oraclecloud"
  | "breezy"
  | "recruitee"
  | "wellfound"
  | "ziprecruiter"
  | "phenom"
  | "unknown";

/** Every concrete platform value (excludes `unknown`). */
export const KNOWN_ATS_PLATFORMS = [
  "linkedin",
  "indeed",
  "greenhouse",
  "workday",
  "lever",
  "ashby",
  "smartrecruiters",
  "icims",
  "taleo",
  "jobvite",
  "successfactors",
  "workable",
  "bamboohr",
  "adp",
  "rippling",
  "jazzhr",
  "paylocity",
  "paycom",
  "clearcompany",
  "teamtailor",
  "oraclecloud",
  "breezy",
  "recruitee",
  "wellfound",
  "ziprecruiter",
  "phenom",
] as const satisfies readonly Exclude<AtsPlatform, "unknown">[];

type KnownAtsPlatform = (typeof KNOWN_ATS_PLATFORMS)[number];

export type AtsUrlPattern = {
  pattern: RegExp;
  platform: KnownAtsPlatform;
};

/** Ordered most-specific first — first match wins. */
export const ATS_URL_PATTERNS: readonly AtsUrlPattern[] = [
  { pattern: /linkedin\.com\/jobs/i, platform: "linkedin" },
  { pattern: /indeed\.com/i, platform: "indeed" },
  { pattern: /oraclecloud\.com.*\/hcmUI\/CandidateExperience/i, platform: "oraclecloud" },
  { pattern: /\.oraclecloud\.com/i, platform: "oraclecloud" },
  { pattern: /taleo\.net|oracle\.com\/taleo/i, platform: "taleo" },
  { pattern: /myworkday(?:jobs|site)\.com|\.wd\d+\.myworkday(?:jobs|site)\.com/i, platform: "workday" },
  {
    pattern: /(?:boards|job-boards)\.greenhouse\.io|greenhouse\.io|[?&]gh_jid=\d+/i,
    platform: "greenhouse",
  },
  { pattern: /jobs\.cvshealth\.com|data-ph-at-id|phenompeople\.com/i, platform: "phenom" },
  { pattern: /jobs\.lever\.co|lever\.co/i, platform: "lever" },
  { pattern: /jobs\.ashbyhq\.com|ashbyhq\.com/i, platform: "ashby" },
  { pattern: /icims\.com|optimumcareers\.com/i, platform: "icims" },
  { pattern: /smartrecruiters\.com/i, platform: "smartrecruiters" },
  { pattern: /jobvite\.com/i, platform: "jobvite" },
  { pattern: /successfactors\.com|sapsf\.com/i, platform: "successfactors" },
  { pattern: /apply\.workable\.com|workable\.com/i, platform: "workable" },
  { pattern: /bamboohr\.com/i, platform: "bamboohr" },
  { pattern: /adp\.com/i, platform: "adp" },
  { pattern: /ats\.rippling\.com|rippling\.com/i, platform: "rippling" },
  { pattern: /applytojob\.com|jazzhr\.com/i, platform: "jazzhr" },
  { pattern: /recruiting\.paylocity\.com|paylocity\.com/i, platform: "paylocity" },
  { pattern: /paycomonline\.net|paycom\.com/i, platform: "paycom" },
  { pattern: /clearcompany\.com/i, platform: "clearcompany" },
  { pattern: /teamtailor\.com/i, platform: "teamtailor" },
  { pattern: /breezy\.hr/i, platform: "breezy" },
  { pattern: /recruitee\.com/i, platform: "recruitee" },
  { pattern: /wellfound\.com/i, platform: "wellfound" },
  { pattern: /ziprecruiter\.com/i, platform: "ziprecruiter" },
];

export const ATS_PLATFORM_NAME_ALIASES: Record<string, KnownAtsPlatform> = {
  linkedin: "linkedin",
  indeed: "indeed",
  greenhouse: "greenhouse",
  workday: "workday",
  lever: "lever",
  ashby: "ashby",
  smartrecruiters: "smartrecruiters",
  icims: "icims",
  taleo: "taleo",
  jobvite: "jobvite",
  successfactors: "successfactors",
  sap: "successfactors",
  sapsf: "successfactors",
  workable: "workable",
  bamboohr: "bamboohr",
  bamboo: "bamboohr",
  adp: "adp",
  rippling: "rippling",
  jazzhr: "jazzhr",
  paylocity: "paylocity",
  paycom: "paycom",
  clearcompany: "clearcompany",
  teamtailor: "teamtailor",
  oraclecloud: "oraclecloud",
  orc: "oraclecloud",
  oraclerecruitingcloud: "oraclecloud",
  breezy: "breezy",
  breezyhr: "breezy",
  recruitee: "recruitee",
  wellfound: "wellfound",
  angellist: "wellfound",
  ziprecruiter: "ziprecruiter",
  zip: "ziprecruiter",
  phenom: "phenom",
  phenompeople: "phenom",
};

export function detectAtsPlatformFromUrl(url: string): KnownAtsPlatform | null {
  const lower = url.toLowerCase();
  for (const { pattern, platform } of ATS_URL_PATTERNS) {
    if (pattern.test(lower)) return platform;
  }
  return null;
}

export function detectAtsPlatformFromName(
  platformField: string,
): KnownAtsPlatform | null {
  const normalized = platformField.toLowerCase().replace(/\s+/g, "");
  return ATS_PLATFORM_NAME_ALIASES[normalized] ?? null;
}

export function detectAtsPlatform(
  canonicalUrl: string,
  platformField: string | null | undefined,
): AtsPlatform {
  const fromUrl = detectAtsPlatformFromUrl(canonicalUrl);
  if (fromUrl) return fromUrl;

  if (platformField) {
    const fromName = detectAtsPlatformFromName(platformField);
    if (fromName) return fromName;
  }

  return "unknown";
}

const NON_ATS_PLATFORM_TOKENS = new Set([
  "generic",
  "unknown",
  "dashboard_manual",
]);

/**
 * Best platform id to persist on `JobTrackerEntry.platform`.
 * URL fingerprint wins over client/adapter platform so Phase 2+ ATS URLs
 * are not stored as `"generic"` when no site adapter exists yet.
 */
export function resolveJobTrackerPlatform(
  url: string,
  clientPlatform: string | null | undefined,
): string | null {
  const fromUrl = detectAtsPlatformFromUrl(url);
  if (fromUrl) return fromUrl;

  const trimmed = clientPlatform?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, "");
  if (NON_ATS_PLATFORM_TOKENS.has(normalized)) return null;

  const fromAlias = ATS_PLATFORM_NAME_ALIASES[normalized];
  if (fromAlias) return fromAlias;

  if ((KNOWN_ATS_PLATFORMS as readonly string[]).includes(normalized)) {
    return normalized;
  }

  return null;
}
