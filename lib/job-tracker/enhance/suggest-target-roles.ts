import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

function normalizeRoleTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

export function suggestAlternativeTargetRoles(input: {
  form: HubRefineryForm;
  jdTargetRole: string;
  isCrossDomain: boolean;
  overlapScore: number;
  maxSuggestions?: number;
}): string[] {
  if (!input.isCrossDomain || input.overlapScore >= 0.12) return [];

  const jdNorm = normalizeRoleTitle(input.jdTargetRole).toLowerCase();
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const entry of input.form.experience ?? []) {
    const title = entry.title?.trim();
    if (!title || title.length < 3) continue;
    const norm = normalizeRoleTitle(title).toLowerCase();
    if (norm === jdNorm || seen.has(norm)) continue;
    seen.add(norm);
    suggestions.push(title);
    if (suggestions.length >= (input.maxSuggestions ?? 3)) break;
  }

  return suggestions.slice(0, input.maxSuggestions ?? 3);
}
