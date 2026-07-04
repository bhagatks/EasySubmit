/** Normalize common product/brand tokens mangled by AI (e.g. "Git Hub" → "GitHub"). */

const BRAND_REPLACEMENTS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bgit\s+hub\s+copilot\b/gi, replacement: "GitHub Copilot" },
  { pattern: /\bgit\s+hub\b/gi, replacement: "GitHub" },
  { pattern: /\bnode\s+\.\s*js\b/gi, replacement: "Node.js" },
  { pattern: /\bnext\s+\.\s*js\b/gi, replacement: "Next.js" },
  { pattern: /\bvs\s+\.\s*code\b/gi, replacement: "VS Code" },
];

export function normalizeBrandTokens(text: string): string {
  let out = text;
  for (const { pattern, replacement } of BRAND_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
