export type CareerArchitectureContent = Record<string, unknown>;

export function buildEngineRefinementPrompt(
  targetRole: string,
  content: CareerArchitectureContent,
): string {
  return [
    "You are the EasySubmit Career Architecture refinement engine.",
    `Target role: ${targetRole || "the candidate's stated goal"}.`,
    "Refine the JSON career architecture below for ATS alignment, clarity, and role fit.",
    "Preserve the same top-level keys and array item shapes. Return ONLY valid JSON — no markdown fences or commentary.",
    "Input architecture:",
    JSON.stringify(content, null, 2),
  ].join("\n\n");
}

export function parseRefinedArchitectureJson(
  text: string,
): CareerArchitectureContent | null {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CareerArchitectureContent;
    }
  } catch {
    /* fall through */
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CareerArchitectureContent;
    }
  } catch {
    return null;
  }

  return null;
}
