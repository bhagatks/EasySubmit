/**
 * Canonical semantic category seeds for user_application_answers.
 *
 * These are the known open-ended / learned field categories the resolution
 * ladder (step 3 — semanticKey) can match across employers and ATS platforms.
 *
 * At user first-login or first Apply, these seeds can be written to the DB
 * as empty shells (confidence 0, hitCount 0) so the lookup map is pre-populated
 * and the ladder doesn't miss on the first encounter.
 *
 * Each entry: semanticKey (stable hash input), label (human-readable), category hint,
 * fieldType, and the label patterns used to classify an incoming field into this bucket.
 */

export type SemanticSeed = {
  /** Stable string fed into semanticKey hash — never change after first deploy */
  key: string;
  /** Human-readable label shown in Settings > Application Answers */
  label: string;
  /** Category for grouping in settings UI */
  category:
    | "contact"
    | "work_auth"
    | "preferences"
    | "education"
    | "eeo"
    | "open_ended"
    | "consent"
    | "misc";
  fieldType: "text" | "textarea" | "select" | "radio" | "checkbox";
  /** Regex patterns (tested against normalized label) to classify incoming fields */
  labelPatterns: RegExp[];
  /** If true: resolved from applicationProfile, not stored as an answer */
  resolvedFromProfile: boolean;
};

export const SEMANTIC_SEEDS: SemanticSeed[] = [
  // ── WORK AUTH ──────────────────────────────────────────────────────────────
  {
    key: "work_auth__authorized",
    label: "Authorized to work",
    category: "work_auth",
    fieldType: "radio",
    labelPatterns: [/authorized to work|legally authorized|eligible to work/],
    resolvedFromProfile: true,
  },
  {
    key: "work_auth__sponsorship",
    label: "Visa sponsorship required",
    category: "work_auth",
    fieldType: "radio",
    labelPatterns: [/visa sponsorship|require sponsorship|need sponsorship/],
    resolvedFromProfile: true,
  },
  {
    key: "work_auth__citizenship_status",
    label: "Citizenship / authorization type",
    category: "work_auth",
    fieldType: "select",
    labelPatterns: [/citizenship|immigration status|work status|authorization type/],
    resolvedFromProfile: true,
  },
  {
    key: "work_auth__visa_type",
    label: "Visa type",
    category: "work_auth",
    fieldType: "text",
    labelPatterns: [/visa type|current visa/],
    resolvedFromProfile: true,
  },

  // ── PREFERENCES ────────────────────────────────────────────────────────────
  {
    key: "pref__salary_expectation",
    label: "Expected salary",
    category: "preferences",
    fieldType: "text",
    labelPatterns: [/expected salary|desired salary|salary expectation|compensation expectation/],
    resolvedFromProfile: true,
  },
  {
    key: "pref__notice_period",
    label: "Notice period",
    category: "preferences",
    fieldType: "select",
    labelPatterns: [/notice period|current notice|serving notice/],
    resolvedFromProfile: true,
  },
  {
    key: "pref__willing_to_relocate",
    label: "Willing to relocate",
    category: "preferences",
    fieldType: "radio",
    labelPatterns: [/willing to relocate|open to relocation|relocat/],
    resolvedFromProfile: true,
  },
  {
    key: "pref__job_type",
    label: "Job type preference",
    category: "preferences",
    fieldType: "select",
    labelPatterns: [/job type|employment type|position type/],
    resolvedFromProfile: true,
  },
  {
    key: "pref__travel",
    label: "Willingness to travel",
    category: "preferences",
    fieldType: "select",
    labelPatterns: [/willing to travel|travel percentage|travel required/],
    resolvedFromProfile: true,
  },

  // ── EDUCATION ──────────────────────────────────────────────────────────────
  {
    key: "edu__highest_degree",
    label: "Highest degree",
    category: "education",
    fieldType: "select",
    labelPatterns: [/highest (degree|education|level)|education level/],
    resolvedFromProfile: true,
  },
  {
    key: "edu__field_of_study",
    label: "Field of study / major",
    category: "education",
    fieldType: "text",
    labelPatterns: [/field of study|major|concentration/],
    resolvedFromProfile: true,
  },
  {
    key: "edu__school_name",
    label: "School / university",
    category: "education",
    fieldType: "text",
    labelPatterns: [/school|university|college|institution/],
    resolvedFromProfile: true,
  },
  {
    key: "edu__graduation_year",
    label: "Graduation year",
    category: "education",
    fieldType: "text",
    labelPatterns: [/graduation year|grad year|year of graduation|graduated/],
    resolvedFromProfile: true,
  },
  {
    key: "edu__gpa",
    label: "GPA",
    category: "education",
    fieldType: "text",
    labelPatterns: [/\bgpa\b|grade point average/],
    resolvedFromProfile: true,
  },

  // ── EEO ────────────────────────────────────────────────────────────────────
  {
    key: "eeo__gender",
    label: "Gender identity",
    category: "eeo",
    fieldType: "select",
    labelPatterns: [/\bgender\b/],
    resolvedFromProfile: true,
  },
  {
    key: "eeo__veteran",
    label: "Veteran status",
    category: "eeo",
    fieldType: "radio",
    labelPatterns: [/veteran status|are you a veteran/],
    resolvedFromProfile: true,
  },
  {
    key: "eeo__disability",
    label: "Disability status",
    category: "eeo",
    fieldType: "radio",
    labelPatterns: [/disabilit/],
    resolvedFromProfile: true,
  },
  {
    key: "eeo__race",
    label: "Race / ethnicity",
    category: "eeo",
    fieldType: "select",
    labelPatterns: [/\brace\b|ethnic/],
    resolvedFromProfile: true,
  },
  {
    key: "eeo__hispanic",
    label: "Hispanic or Latino",
    category: "eeo",
    fieldType: "radio",
    labelPatterns: [/hispanic|latino/],
    resolvedFromProfile: true,
  },

  // ── OPEN-ENDED (learned, stored as answers) ────────────────────────────────
  {
    key: "oe__why_company",
    label: "Why this company / role",
    category: "open_ended",
    fieldType: "textarea",
    labelPatterns: [
      /why (are you |do you want to |this |interested in )/,
      /what (draws|attracted|excites|interests) you/,
      /tell us (about yourself|why you)/,
      /motivation for applying/,
    ],
    resolvedFromProfile: false,
  },
  {
    key: "oe__strengths",
    label: "Key strengths",
    category: "open_ended",
    fieldType: "textarea",
    labelPatterns: [
      /key strengths|top strengths|greatest strength/,
      /what sets you apart|unique (qualities|value)/,
    ],
    resolvedFromProfile: false,
  },
  {
    key: "oe__experience_description",
    label: "Relevant experience description",
    category: "open_ended",
    fieldType: "textarea",
    labelPatterns: [
      /describe your (experience|background|work)/,
      /tell us about your (experience|background)/,
      /relevant experience/,
    ],
    resolvedFromProfile: false,
  },
  {
    key: "oe__years_total_experience",
    label: "Total years of experience",
    category: "open_ended",
    fieldType: "text",
    labelPatterns: [/total years|years of (professional |work |overall )?experience/],
    resolvedFromProfile: false,
  },
  {
    key: "oe__years_with_x",
    label: "Years of experience with [skill]",
    category: "open_ended",
    fieldType: "text",
    labelPatterns: [/years (of experience )?(with|in|using)\b/],
    resolvedFromProfile: false,
  },
  {
    key: "oe__culture_fit",
    label: "Culture / team fit",
    category: "open_ended",
    fieldType: "textarea",
    labelPatterns: [
      /culture fit|team (environment|culture|dynamic)/,
      /what type of (team|environment|workplace)/,
    ],
    resolvedFromProfile: false,
  },
  {
    key: "oe__availability_detail",
    label: "Availability / start date detail",
    category: "open_ended",
    fieldType: "text",
    labelPatterns: [/when can you start|available to start|earliest availability/],
    resolvedFromProfile: false,
  },
  {
    key: "oe__cover_letter_text",
    label: "Cover letter (text field)",
    category: "open_ended",
    fieldType: "textarea",
    labelPatterns: [/cover letter|motivation letter|letter of interest/],
    resolvedFromProfile: false,
  },
  {
    key: "oe__additional_info",
    label: "Additional information",
    category: "open_ended",
    fieldType: "textarea",
    labelPatterns: [/additional (information|comments|details)|anything else/],
    resolvedFromProfile: false,
  },

  // ── MISC / CONSENT ─────────────────────────────────────────────────────────
  {
    key: "misc__referral_source",
    label: "How did you hear about this role",
    category: "misc",
    fieldType: "select",
    labelPatterns: [/how did you (hear|find|learn) (about|of)/],
    resolvedFromProfile: false,
  },
  {
    key: "misc__security_clearance",
    label: "Security clearance",
    category: "misc",
    fieldType: "radio",
    labelPatterns: [/security clearance/],
    resolvedFromProfile: false,
  },
  {
    key: "consent__background_check",
    label: "Background check consent",
    category: "consent",
    fieldType: "checkbox",
    labelPatterns: [/background check|consent to (a )?background/],
    resolvedFromProfile: false,
  },
  {
    key: "consent__nda",
    label: "NDA consent",
    category: "consent",
    fieldType: "checkbox",
    labelPatterns: [/willing to sign (an? )?nda|non.?disclosure/],
    resolvedFromProfile: false,
  },
];

/**
 * Classify an incoming field label into a semantic seed, if one matches.
 * Returns the first matching seed or null.
 */
export function classifyFieldToSeed(label: string): SemanticSeed | null {
  const normalized = label.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  for (const seed of SEMANTIC_SEEDS) {
    if (seed.labelPatterns.some((p) => p.test(normalized))) {
      return seed;
    }
  }
  return null;
}
