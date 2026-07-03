import type { AtsPlatform } from "@/src/shared/ats-platform-detection";
import { detectAtsPlatformFromUrl } from "@/src/shared/ats-platform-detection";
import type { ExtensionPlatform } from "./types";

/** ATS engine inferred from URL — alias of detected platform id. */
export type AtsEngine = AtsPlatform;

const EXTENSION_PLATFORM_MAP: Record<AtsPlatform, ExtensionPlatform> = {
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
  workable: "workable",
  bamboohr: "bamboohr",
  adp: "adp",
  rippling: "rippling",
  jazzhr: "jazzhr",
  paylocity: "paylocity",
  paycom: "paycom",
  clearcompany: "clearcompany",
  teamtailor: "teamtailor",
  oraclecloud: "generic",
  breezy: "generic",
  recruitee: "generic",
  wellfound: "generic",
  ziprecruiter: "generic",
  phenom: "generic",
  unknown: "generic",
};

export type AtsFingerprint = {
  engine: AtsEngine;
  suggestedPlatform: ExtensionPlatform;
};

export function fingerprintAtsFromUrl(url: string): AtsFingerprint {
  const detected = detectAtsPlatformFromUrl(url);
  const platform: AtsPlatform = detected ?? "unknown";
  return {
    engine: platform,
    suggestedPlatform: EXTENSION_PLATFORM_MAP[platform],
  };
}
