import type { SkillsRulesV2 } from "@/lib/resume/v2/rules-config";

export type ParsedSkillCategoryV2 = {
  label: string;
  terms: string[];
};

export type SkillsValidationV2 = {
  categoryLines: number;
  uniqueTermCount: number;
  categories: ParsedSkillCategoryV2[];
  warnings: string[];
  errors: string[];
};

function normalizeSkillTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitSkillTerms(raw: string): string[] {
  return raw
    .split(/[,;|•·]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

/** Parse chat-style category blocks: `Label: a, b, c` or `- **Label:** a, b, c`. */
export function parseSkillsCategoriesV2(text: string): ParsedSkillCategoryV2[] {
  const categories: ParsedSkillCategoryV2[] = [];

  for (const rawLine of text.split("\n")) {
    let trimmed = rawLine.trim();
    if (!trimmed) continue;

    trimmed = trimmed.replace(/^[-•*]\s+/, "");
    trimmed = trimmed.replace(/\*\*/g, "");

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex <= 0) {
      categories.push({ label: "Skills", terms: splitSkillTerms(trimmed) });
      continue;
    }

    const label = trimmed.slice(0, colonIndex).trim();
    const termsRaw = trimmed.slice(colonIndex + 1);
    categories.push({ label, terms: splitSkillTerms(termsRaw) });
  }

  return categories;
}

export function countUniqueSkillTermsV2(categories: ParsedSkillCategoryV2[]): number {
  const seen = new Set<string>();
  for (const category of categories) {
    for (const term of category.terms) {
      const normalized = normalizeSkillTerm(term);
      if (normalized) seen.add(normalized);
    }
  }
  return seen.size;
}

export type ValidateSkillsV2Options = {
  modeLabel?: string;
  unlimitedContent?: boolean;
};

export function validateSkillsV2(
  text: string,
  rules: SkillsRulesV2,
  options: ValidateSkillsV2Options = {},
): SkillsValidationV2 {
  const modeLabel = options.modeLabel ?? "2-page";
  const unlimitedContent = options.unlimitedContent === true;
  const categories = parseSkillsCategoriesV2(text);
  const categoryLines = categories.length;
  const uniqueTermCount = countUniqueSkillTermsV2(categories);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (rules.forbidTables && /\|.+\|/.test(text)) {
    errors.push("Skills section must not use tables (RULES v2).");
  }

  if (!unlimitedContent) {
    if (categoryLines > rules.maxCategoryLines) {
      warnings.push(
        `Skills has ${categoryLines} category lines — max ${rules.maxCategoryLines} for ${modeLabel} mode.`,
      );
    }

    if (uniqueTermCount > rules.maxUniqueTerms) {
      warnings.push(
        `Skills has ${uniqueTermCount} unique terms — max ${rules.maxUniqueTerms} for ${modeLabel} mode.`,
      );
    }

    for (const category of categories) {
      if (category.terms.length > rules.softMaxTermsPerCategory) {
        warnings.push(
          `Category "${category.label}" has ${category.terms.length} terms — soft max ${rules.softMaxTermsPerCategory}.`,
        );
      }
    }
  }

  if (!rules.allowCategoryBlocks && categoryLines > 1) {
    warnings.push("Skills should use a single comma-separated block in this mode.");
  }

  return { categoryLines, uniqueTermCount, categories, warnings, errors };
}
