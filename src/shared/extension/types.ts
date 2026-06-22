export type ExtensionPlatform =
  | "linkedin"
  | "indeed"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "smartrecruiters"
  | "icims"
  | "taleo"
  | "jobvite"
  | "generic";

export type ScrapedJobMetadata = {
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  description: string | null;
  platform: ExtensionPlatform;
  confidence: number;
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
  jobCardEnabled: boolean;
  enabledPlatforms: ExtensionPlatform[];
  genericFallbackEnabled: boolean;
  minConfidence: number;
  apiBaseUrl: string;
  oneClickApply?: boolean;
  oneClickApplyPlatforms?: ExtensionPlatform[];
  autoApplyEnabled?: boolean;
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
