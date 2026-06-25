import type { ExtensionPlatform } from "./types";

/** ATS engine inferred from URL — shared with job-tracker platform-rules over time. */
export type AtsEngine =
  | "linkedin"
  | "indeed"
  | "greenhouse"
  | "workday"
  | "phenom"
  | "icims"
  | "lever"
  | "ashby"
  | "smartrecruiters"
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
  | "unknown";

const URL_ENGINE_PATTERNS: Array<{ pattern: RegExp; engine: AtsEngine; platform: ExtensionPlatform }> = [
  { pattern: /linkedin\.com\/jobs/i, engine: "linkedin", platform: "linkedin" },
  { pattern: /indeed\.com/i, engine: "indeed", platform: "indeed" },
  { pattern: /boards\.greenhouse\.io|greenhouse\.io|[?&]gh_jid=\d+/i, engine: "greenhouse", platform: "greenhouse" },
  { pattern: /myworkdayjobs\.com|\.wd\d+\.myworkdayjobs\.com/i, engine: "workday", platform: "workday" },
  { pattern: /jobs\.cvshealth\.com|data-ph-at-id|phenompeople\.com/i, engine: "phenom", platform: "generic" },
  { pattern: /icims\.com|optimumcareers\.com/i, engine: "icims", platform: "icims" },
  { pattern: /jobs\.lever\.co|lever\.co/i, engine: "lever", platform: "lever" },
  { pattern: /jobs\.ashbyhq\.com|ashbyhq\.com/i, engine: "ashby", platform: "ashby" },
  { pattern: /smartrecruiters\.com/i, engine: "smartrecruiters", platform: "smartrecruiters" },
  { pattern: /taleo\.net|oracle\.com\/taleo/i, engine: "taleo", platform: "taleo" },
  { pattern: /jobvite\.com/i, engine: "jobvite", platform: "jobvite" },
  { pattern: /successfactors\.com|sapsf\.com/i, engine: "successfactors", platform: "generic" },
  { pattern: /workable\.com/i, engine: "workable", platform: "generic" },
  { pattern: /bamboohr\.com/i, engine: "bamboohr", platform: "generic" },
  { pattern: /adp\.com/i, engine: "adp", platform: "generic" },
  { pattern: /rippling\.com/i, engine: "rippling", platform: "generic" },
  { pattern: /jazzhr\.com/i, engine: "jazzhr", platform: "generic" },
  { pattern: /paylocity\.com/i, engine: "paylocity", platform: "generic" },
  { pattern: /paycom\.com/i, engine: "paycom", platform: "generic" },
  { pattern: /clearcompany\.com/i, engine: "clearcompany", platform: "generic" },
  { pattern: /teamtailor\.com/i, engine: "teamtailor", platform: "generic" },
];

export type AtsFingerprint = {
  engine: AtsEngine;
  suggestedPlatform: ExtensionPlatform;
};

export function fingerprintAtsFromUrl(url: string): AtsFingerprint {
  const lower = url.toLowerCase();
  for (const entry of URL_ENGINE_PATTERNS) {
    if (entry.pattern.test(lower)) {
      return { engine: entry.engine, suggestedPlatform: entry.platform };
    }
  }
  return { engine: "unknown", suggestedPlatform: "generic" };
}
