/**
 * Modular cover letter prose matrix for EasySubmit.ai.
 *
 * Compose letters by selecting one block from each tier:
 *   opening → bodyAlignment → closing
 *
 * Placeholders are filled at render time via {@link renderCoverLetterBlock}.
 *
 * Style guardrails (enforced in copy, not runtime):
 * - Grounded, executive, sharp — no hype or filler
 * - No AI clichés ("fast-paced digital world", "incredibly thrilled", "testament to…")
 * - Use "journey" (not "trajectory") when referring to career progression
 */

// ─── Placeholder contract ─────────────────────────────────────────────────────

/** Variables available to every prose block in the matrix. */
export type CoverLetterTemplatePlaceholders = {
  /** Hiring organization (e.g. "Acme Corp"). */
  company: string;
  /** Role the candidate is applying for (e.g. "Senior Software Engineer"). */
  targetTitle: string;
  /** Primary technical or domain skill to highlight (e.g. "TypeScript"). */
  topSkill: string;
  /** Most recent job title (e.g. "Staff Engineer"). */
  priorTitle: string;
};

export const COVER_LETTER_PLACEHOLDER_KEYS = [
  "company",
  "targetTitle",
  "topSkill",
  "priorTitle",
] as const satisfies ReadonlyArray<keyof CoverLetterTemplatePlaceholders>;

// ─── Block types ──────────────────────────────────────────────────────────────

export type CoverLetterProseBlock = {
  /** Stable id for logging, A/B tests, and user preference storage. */
  id: string;
  /** Short label for UI pickers ("Direct", "Evidence-led", …). */
  label: string;
  /** Prose with `${placeholder}` tokens — one paragraph per block. */
  text: string;
};

export type CoverLetterTemplateTier = "openings" | "bodyAlignments" | "closings";

export type CoverLetterTemplateMatrix = {
  openings: readonly [CoverLetterProseBlock, CoverLetterProseBlock, CoverLetterProseBlock];
  bodyAlignments: readonly [CoverLetterProseBlock, CoverLetterProseBlock, CoverLetterProseBlock];
  closings: readonly [CoverLetterProseBlock, CoverLetterProseBlock, CoverLetterProseBlock];
};

// ─── Prose matrix ─────────────────────────────────────────────────────────────

export const COVER_LETTER_TEMPLATE_MATRIX = {
  openings: [
    {
      id: "opening-direct",
      label: "Direct",
      text: "Dear ${company} hiring team,\n\nI am applying for the ${targetTitle} role. My work as a ${priorTitle} has centered on ${topSkill}, and I would like to bring that focus to your team.",
    },
    {
      id: "opening-evidence",
      label: "Evidence-led",
      text: "Dear ${company} hiring team,\n\nI am writing regarding the ${targetTitle} position. In my current capacity as ${priorTitle}, I have applied ${topSkill} to deliver measurable results, and I see a clear match with the work outlined in your posting.",
    },
    {
      id: "opening-grounded",
      label: "Grounded",
      text: "Dear ${company} hiring team,\n\nI would like to be considered for ${targetTitle}. My professional journey has moved through ${priorTitle} roles where ${topSkill} was central to how I planned, built, and shipped work.",
    },
  ],

  bodyAlignments: [
    {
      id: "body-skill-fit",
      label: "Skill-to-role fit",
      text: "Your description calls for depth in ${topSkill}. That is where I have spent most of my recent years: scoping problems, making tradeoffs explicit, and leaving systems easier to operate than I found them. The ${targetTitle} role reads as a place to apply that discipline at a higher level of scope.",
    },
    {
      id: "body-prior-proof",
      label: "Prior role proof",
      text: "As ${priorTitle}, I owned outcomes end to end — not only the technical work, but the coordination required to land it. ${topSkill} was the through-line: selecting the right approach, documenting decisions, and aligning stakeholders before execution. I would bring the same standard of clarity to ${company}.",
    },
    {
      id: "body-practical",
      label: "Practical contribution",
      text: "I am not looking for a generic next step. I am looking for a team that values careful execution on hard problems. ${company}'s ${targetTitle} opening maps to work I have already done: applying ${topSkill} in production, improving reliability, and mentoring others without adding process for its own sake.",
    },
  ],

  closings: [
    {
      id: "closing-concise",
      label: "Concise",
      text: "I would welcome a conversation about how my background supports your goals for this role. Thank you for your time and consideration.",
    },
    {
      id: "closing-forward",
      label: "Forward",
      text: "If helpful, I can walk through specific projects where ${topSkill} and my experience as ${priorTitle} translated into outcomes relevant to ${targetTitle}. I appreciate your review and am available to speak at your convenience.",
    },
    {
      id: "closing-measured",
      label: "Measured",
      text: "I am confident I can contribute from the first month and grow with the demands of the role. I would be glad to discuss fit in more detail. Thank you for considering my application to ${company}.",
    },
  ],
} as const satisfies CoverLetterTemplateMatrix;

// ─── Render helpers ───────────────────────────────────────────────────────────

const PLACEHOLDER_PATTERN = /\$\{(\w+)\}/g;

/**
 * Replace `${key}` tokens in a template string.
 * Unknown keys are left intact so callers can detect misconfiguration.
 */
export function renderCoverLetterBlock(
  template: string,
  placeholders: CoverLetterTemplatePlaceholders,
): string {
  return template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    if (key in placeholders) {
      return placeholders[key as keyof CoverLetterTemplatePlaceholders];
    }
    return match;
  });
}

export type CoverLetterComposition = {
  openingId: string;
  bodyAlignmentId: string;
  closingId: string;
};

/** Resolve a block by tier + id; returns undefined if not found. */
export function findCoverLetterBlock(
  tier: CoverLetterTemplateTier,
  id: string,
): CoverLetterProseBlock | undefined {
  return COVER_LETTER_TEMPLATE_MATRIX[tier].find((block) => block.id === id);
}

/**
 * Stitch three tiers into a full letter body (no signature line).
 * Paragraphs are separated by a blank line.
 */
export function composeCoverLetterFromMatrix(
  selection: CoverLetterComposition,
  placeholders: CoverLetterTemplatePlaceholders,
): string | null {
  const opening = findCoverLetterBlock("openings", selection.openingId);
  const body = findCoverLetterBlock("bodyAlignments", selection.bodyAlignmentId);
  const closing = findCoverLetterBlock("closings", selection.closingId);

  if (!opening || !body || !closing) return null;

  return [
    renderCoverLetterBlock(opening.text, placeholders),
    renderCoverLetterBlock(body.text, placeholders),
    renderCoverLetterBlock(closing.text, placeholders),
  ].join("\n\n");
}

/** Default composition: first option in each tier (stable, deterministic). */
export const DEFAULT_COVER_LETTER_COMPOSITION: CoverLetterComposition = {
  openingId: COVER_LETTER_TEMPLATE_MATRIX.openings[0].id,
  bodyAlignmentId: COVER_LETTER_TEMPLATE_MATRIX.bodyAlignments[0].id,
  closingId: COVER_LETTER_TEMPLATE_MATRIX.closings[0].id,
};
