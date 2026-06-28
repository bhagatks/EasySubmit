/**
 * Per-platform ATS scoring — applies platform-specific dimension weights
 * to the shared sub-scores to produce 6 individual platform scores.
 *
 * Weights are derived from public ATS research and the sunnypatell/ats-screener
 * open-source profiles. The sub-scores are the same for every platform;
 * only the weighting differs.
 */

export type PlatformScoreInput = {
  formattingScore: number;       // 0–100 (from ATS compliance pillar)
  /** Exact-match keyword coverage — used by exact-match platforms (Workday, Taleo, SuccessFactors). */
  exactKeywordScore: number;     // 0–100
  /** Fuzzy/synonym keyword coverage — used by iCIMS. */
  fuzzyKeywordScore: number;     // 0–100
  /** Semantic (TF cosine) similarity — used by Greenhouse, Lever. */
  semanticKeywordScore: number;  // 0–100
  sectionsScore: number;         // 0–100 (from completeness pillar)
  experienceScore: number;       // 0–100 (from bullet quality pillar)
  educationScore: number;        // 0–100 (has degree + school)
  quantificationRate: number;    // 0–100 (% of quantified bullets)
};

export type PlatformScoreResult = {
  id: string;
  name: string;
  vendor: string;
  score: number;
  passes: boolean;
  grade: "Excellent" | "Good" | "Fair" | "Poor";
  breakdown: {
    formatting: number;
    keywords: number;
    sections: number;
    experience: number;
    education: number;
  };
};

type KeywordStrategy = "exact" | "fuzzy" | "semantic";

type PlatformProfile = {
  id: string;
  name: string;
  vendor: string;
  passingScore: number;
  keywordStrategy: KeywordStrategy;
  weights: {
    formatting: number;
    keywords: number;
    sections: number;
    experience: number;
    education: number;
    quantification: number;
  };
};

const PROFILES: PlatformProfile[] = [
  {
    id: "workday",
    name: "Workday",
    vendor: "Workday, Inc.",
    passingScore: 70,
    keywordStrategy: "exact",
    weights: { formatting: 0.25, keywords: 0.30, sections: 0.15, experience: 0.15, education: 0.10, quantification: 0.05 },
  },
  {
    id: "taleo",
    name: "Taleo",
    vendor: "Oracle Corporation",
    passingScore: 65,
    keywordStrategy: "exact",
    weights: { formatting: 0.30, keywords: 0.25, sections: 0.20, experience: 0.10, education: 0.10, quantification: 0.05 },
  },
  {
    id: "successfactors",
    name: "SuccessFactors",
    vendor: "SAP SE",
    passingScore: 65,
    keywordStrategy: "exact",
    weights: { formatting: 0.20, keywords: 0.30, sections: 0.15, experience: 0.20, education: 0.10, quantification: 0.05 },
  },
  {
    id: "icims",
    name: "iCIMS",
    vendor: "iCIMS, Inc.",
    passingScore: 65,
    keywordStrategy: "fuzzy",
    weights: { formatting: 0.20, keywords: 0.35, sections: 0.15, experience: 0.15, education: 0.10, quantification: 0.05 },
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    vendor: "Greenhouse Software",
    passingScore: 55,
    keywordStrategy: "semantic",
    weights: { formatting: 0.15, keywords: 0.30, sections: 0.10, experience: 0.25, education: 0.10, quantification: 0.10 },
  },
  {
    id: "lever",
    name: "Lever",
    vendor: "Lever (Employ Inc.)",
    passingScore: 50,
    keywordStrategy: "semantic",
    weights: { formatting: 0.15, keywords: 0.25, sections: 0.10, experience: 0.30, education: 0.10, quantification: 0.10 },
  },
];

function toGrade(score: number): PlatformScoreResult["grade"] {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

function resolveKeywordScore(input: PlatformScoreInput, strategy: KeywordStrategy): number {
  if (strategy === "exact") return input.exactKeywordScore;
  if (strategy === "fuzzy") return input.fuzzyKeywordScore;
  return input.semanticKeywordScore;
}

export function computePlatformScores(input: PlatformScoreInput): PlatformScoreResult[] {
  return PROFILES.map((p) => {
    const keywordScore = resolveKeywordScore(input, p.keywordStrategy);
    const raw =
      input.formattingScore * p.weights.formatting +
      keywordScore * p.weights.keywords +
      input.sectionsScore * p.weights.sections +
      input.experienceScore * p.weights.experience +
      input.educationScore * p.weights.education +
      input.quantificationRate * p.weights.quantification;

    const score = Math.max(0, Math.min(100, Math.round(raw)));

    return {
      id: p.id,
      name: p.name,
      vendor: p.vendor,
      score,
      passes: score >= p.passingScore,
      grade: toGrade(score),
      breakdown: {
        formatting: input.formattingScore,
        keywords: keywordScore,
        sections: input.sectionsScore,
        experience: input.experienceScore,
        education: input.educationScore,
      },
    };
  });
}
