export type ExtensionPlatform =
  // Core
  | "linkedin"
  | "indeed"
  | "greenhouse"
  | "workday"
  // Phase 1
  | "lever"
  | "ashby"
  | "smartrecruiters"
  | "icims"
  | "taleo"
  | "jobvite"
  // Phase 2
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
  | "generic";

export type ScrapedJobMetadata = {
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  description: string | null;
  platform: ExtensionPlatform;
  confidence: number;
  /** Structured fields from JSON-LD JobPosting schema — higher signal than raw description blob. */
  jsonLdFields?: {
    qualifications?: string;
    responsibilities?: string;
    incentives?: string;
  };
};

export type SiteAdapter = {
  platform: ExtensionPlatform;
  urlPatterns: RegExp[];
  mountSelectors: string[];
  scrape: (doc: Document) => ScrapedJobMetadata | null;
  detectConfidence: (doc: Document, url: string) => number;
};

export type ExtensionConnectedUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export type ExtensionRuntimeConfig = {
  extensionGlobalSwitch: boolean;
  jobCardEnabled: boolean;
  enabledPlatforms: ExtensionPlatform[];
  genericFallbackEnabled: boolean;
  minConfidence: number;
  apiBaseUrl: string;
  autoApplyUserSwitch?: boolean;
  oneClickApplyPlatforms?: ExtensionPlatform[];
  autoApplyEnabled?: boolean;
  customizeResume?: boolean;
  applicationProfile?: import("@/lib/profile/application-profile").ApplicationProfile | null;
  connectedUser?: ExtensionConnectedUser | null;
};

export type ApplyPipelineResponse = {
  success: boolean;
  saved?: boolean;
  id?: string;
  status?: string;
  phases?: string[];
  pendingPhase?: string | null;
  hasTailoredResume?: boolean;
  sourceProfileId?: string | null;
  error?: string;
};

export type JobSavePayload = {
  url: string;
  title: string;
  company?: string | null;
  location?: string | null;
  salaryText?: string | null;
  description?: string | null;
  platform?: string | null;
  sourceProfileId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ExtensionResumeProfileOption = {
  id: string;
  label: string;
  isDefault: boolean;
};

export type ExtensionResumeProfilesResponse = {
  success: boolean;
  profiles?: ExtensionResumeProfileOption[];
  pickerMode?: "DEFAULT" | "LAST_SELECTED";
  defaultProfileId?: string | null;
  error?: string;
};

export type JobStatusResponse = {
  success: boolean;
  saved: boolean;
  id?: string;
  status?: string;
  title?: string;
  error?: string;
};
