// Types shared across the entire JD Brain pipeline.

export type JDSeniority =
  | "entry"
  | "mid"
  | "senior"
  | "staff"
  | "principal"
  | "lead"
  | "manager"
  | "director"
  | "vp"
  | "exec";

export type JDScope = "ic" | "manager" | "lead" | "hybrid";

export type JDDomain =
  | "software-engineering"
  | "frontend"
  | "backend"
  | "fullstack"
  | "devops-sre"
  | "data-engineering"
  | "ml-ai"
  | "security"
  | "product-management"
  | "mobile"
  | "data-science"
  | "qa-testing"
  | "procurement-supply-chain"
  | "medtech-regulatory"
  | "other";

export type JDImpactDimension =
  | "reliability"
  | "scale"
  | "speed"
  | "cost"
  | "revenue"
  | "quality"
  | "security"
  | "team"
  | "delivery";

export type JDSegments = {
  requirements: string;
  responsibilities: string;
  preferred: string;
  context: string;
  source: "json-ld" | "header" | "heuristic" | "full-text";
  wordCount: {
    requirements: number;
    responsibilities: number;
    preferred: number;
  };
};

export type JSONLDJobFields = {
  qualifications?: string;
  responsibilities?: string;
  incentives?: string;
};

export type JDIntelligence = {
  /** Job title extracted from the JD (e.g. "Senior Manager, People Enablement"). Use as effective targetRole in prompts when present. */
  extractedJobTitle: string | null;
  mustHaveSkills: string[];
  mustHaveYearsExp: number | null;
  mustHaveDegree: string | null;
  mustHaveCerts: string[];

  preferredSkills: string[];
  preferredDomain: string[];

  seniority: JDSeniority;
  scope: JDScope;
  domain: JDDomain;
  industryDomain: string[];

  /** Keywords from requirements section — highest weight (×3) in gap scoring. */
  tier1Keywords: string[];
  /** Keywords from responsibilities section — medium weight (×2). */
  tier2Keywords: string[];
  /** Keywords from preferred section — lowest weight (×1). */
  tier3Keywords: string[];

  summaryTheme: string;
  targetVerbs: string[];
  deliverables: string[];
  impactDimensions: JDImpactDimension[];
  emphasisAreas: string[];
  deprioritize: string[];

  velocitySignal: "fast" | "moderate" | "structured" | null;
  ownershipLevel: "high" | "medium" | "low" | null;

  source: "deterministic" | "ai" | "hybrid";
  confidence: number;
  extractedAt: string;
};

export type ResumeEnhanceDirective = {
  mustAddSkills: string[];
  mustRemoveSkills: string[];
  mustWeaveKeywords: string[];
  /** Effective job title from the JD — should replace the user's profileRole in prompts. */
  effectiveTargetRole: string | null;

  roleLevel: JDSeniority;
  scope: JDScope;

  targetVerbs: string[];
  impactDimensions: JDImpactDimension[];
  quantHints: string[];

  summaryTheme: string;
  emphasisAreas: string[];
  deprioritize: string[];

  cultureSignals: {
    velocity: "fast" | "moderate" | "structured" | null;
    ownership: "high" | "medium" | "low" | null;
    industry: string[];
  };
};

export function makeEmptyIntelligence(): JDIntelligence {
  return {
    extractedJobTitle: null,
    mustHaveSkills: [],
    mustHaveYearsExp: null,
    mustHaveDegree: null,
    mustHaveCerts: [],
    preferredSkills: [],
    preferredDomain: [],
    seniority: "mid",
    scope: "ic",
    domain: "other",
    industryDomain: [],
    tier1Keywords: [],
    tier2Keywords: [],
    tier3Keywords: [],
    summaryTheme: "",
    targetVerbs: [],
    deliverables: [],
    impactDimensions: [],
    emphasisAreas: [],
    deprioritize: [],
    velocitySignal: null,
    ownershipLevel: null,
    source: "deterministic",
    confidence: 0,
    extractedAt: new Date().toISOString(),
  };
}
