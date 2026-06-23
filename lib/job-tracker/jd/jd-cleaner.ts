// Layer 1 — Strip noise from raw job descriptions before any analysis.
// Never throws: on any error returns the raw input unchanged.

const EEO_PATTERNS = [
  /equal\s+opportunity\s+employer/gi,
  /eeo\s+statement/gi,
  /we\s+do\s+not\s+discriminate/gi,
  /without\s+regard\s+to\s+race,?\s+color/gi,
  /disability\s+accommodat/gi,
  /reasonable\s+accommodat/gi,
  /national\s+origin.*religion/gi,
  /affirmative\s+action/gi,
  /protected\s+veteran/gi,
  /americans\s+with\s+disabilities/gi,
  /ada\s+compliant/gi,
];

const BENEFITS_SECTION_RE =
  /(?:^|\n)\s*(?:benefits?|compensation|what\s+we\s+offer|perks?|why\s+join\s+us|total\s+rewards?)\s*:?\s*\n([\s\S]{0,2000}?)(?=\n\s*[A-Z][^\n]{2,}\s*\n|$)/gi;

const APPLY_INSTRUCTIONS_RE =
  /(?:how\s+to\s+apply|to\s+apply,?|apply\s+(?:now|today|here)|submit\s+your\s+application|click\s+(?:here\s+)?to\s+apply)[\s\S]{0,500}/gi;

const BOILERPLATE_PATTERNS = [
  /we\s+are\s+an\s+equal\s+opportunity[\s\S]{0,300}/gi,
  /\bplease\s+note\s+that\s+only\s+(?:short)?listed[\s\S]{0,200}/gi,
  /due\s+to\s+(?:the\s+)?(?:volume|high\s+number)\s+of\s+applications[\s\S]{0,300}/gi,
  /powered\s+by\s+(?:greenhouse|lever|workday|icims|jobvite|ashby|smartrecruiters)/gi,
];

export type JDCleanResult = {
  cleaned: string;
  wordCount: number;
  likelyTruncated: boolean;
  strippedTypes: string[];
};

export function cleanJobDescription(raw: string): JDCleanResult {
  try {
    const strippedTypes: string[] = [];
    let text = raw;

    // Normalize encoding
    text = text
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/•/g, "-")
      .replace(/ /g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    // Strip EEO boilerplate
    let eeoStripped = false;
    for (const pattern of EEO_PATTERNS) {
      const before = text.length;
      text = text.replace(pattern, "");
      if (text.length < before) eeoStripped = true;
    }
    if (eeoStripped) strippedTypes.push("eeo");

    // Strip benefits sections
    const beforeBenefits = text.length;
    text = text.replace(BENEFITS_SECTION_RE, "");
    if (text.length < beforeBenefits) strippedTypes.push("benefits");

    // Strip apply instructions
    const beforeApply = text.length;
    text = text.replace(APPLY_INSTRUCTIONS_RE, "");
    if (text.length < beforeApply) strippedTypes.push("apply-instructions");

    // Strip generic boilerplate
    for (const pattern of BOILERPLATE_PATTERNS) {
      text = text.replace(pattern, "");
    }

    // Collapse excessive blank lines
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    const words = text.split(/\s+/).filter(Boolean);
    const likelyTruncated = words.length < 80;

    return {
      cleaned: text,
      wordCount: words.length,
      likelyTruncated,
      strippedTypes,
    };
  } catch {
    const words = raw.split(/\s+/).filter(Boolean);
    return {
      cleaned: raw,
      wordCount: words.length,
      likelyTruncated: words.length < 80,
      strippedTypes: [],
    };
  }
}
