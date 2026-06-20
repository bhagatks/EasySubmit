/** Split comma-joined skill strings into individual entries for UI display. */
export function normalizeSkillList(skills: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of skills) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const parts =
      /[,;|•·\/]/.test(trimmed) || trimmed.includes("\n")
        ? trimmed.split(/[,;|•·\/]|\n/).map((part) => part.trim())
        : [trimmed];

    for (const part of parts) {
      if (!part) continue;
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(part);
    }
  }

  return normalized;
}
