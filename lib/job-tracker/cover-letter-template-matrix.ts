/**
 * Modular cover letter prose matrix for EasySubmit.ai (deterministic / pipeline path).
 *
 * Compose letters by selecting one block from each tier:
 *   opening → experience → whyCompany → closing
 *
 * Targets ~300–350 words (aligned with AI cover letter rules) without using AI.
 *
 * Style guardrails (enforced in copy):
 * - Professional, confident, conversational — not robotic
 * - No AI clichés or banned phrases from cover-letter-rules
 * - Use "journey" (not "trajectory") for career progression
 * - Do not open with "I am writing to apply..."
 */

// ─── Placeholder contract ─────────────────────────────────────────────────────

export type CoverLetterTemplatePlaceholders = {
  company: string;
  targetTitle: string;
  topSkill: string;
  secondSkill: string;
  thirdSkill: string;
  priorTitle: string;
  priorCompany: string;
  jdKeyword: string;
  jdKeyword2: string;
  achievementLine: string;
  summarySnippet: string;
};

export const COVER_LETTER_PLACEHOLDER_KEYS = [
  "company",
  "targetTitle",
  "topSkill",
  "secondSkill",
  "thirdSkill",
  "priorTitle",
  "priorCompany",
  "jdKeyword",
  "jdKeyword2",
  "achievementLine",
  "summarySnippet",
] as const satisfies ReadonlyArray<keyof CoverLetterTemplatePlaceholders>;

// ─── Block types ──────────────────────────────────────────────────────────────

export type CoverLetterProseBlock = {
  id: string;
  label: string;
  text: string;
};

export type CoverLetterTemplateTier =
  | "openings"
  | "experienceBlocks"
  | "whyCompany"
  | "closings";

export type CoverLetterTemplateMatrix = {
  openings: readonly [CoverLetterProseBlock, CoverLetterProseBlock, CoverLetterProseBlock];
  experienceBlocks: readonly [
    CoverLetterProseBlock,
    CoverLetterProseBlock,
    CoverLetterProseBlock,
  ];
  whyCompany: readonly [CoverLetterProseBlock, CoverLetterProseBlock, CoverLetterProseBlock];
  closings: readonly [CoverLetterProseBlock, CoverLetterProseBlock, CoverLetterProseBlock];
};

// ─── Prose matrix ─────────────────────────────────────────────────────────────

export const COVER_LETTER_TEMPLATE_MATRIX = {
  openings: [
    {
      id: "opening-direct",
      label: "Direct",
      text: "Dear ${company} hiring team,\n\nThe ${targetTitle} opening at ${company} aligns with the work I have led as ${priorTitle}. ${summarySnippet} My recent focus on ${topSkill}, ${secondSkill}, and ${thirdSkill} maps closely to what your posting emphasizes around ${jdKeyword}, and I would welcome the chance to contribute that experience on your team.",
    },
    {
      id: "opening-evidence",
      label: "Evidence-led",
      text: "Dear ${company} hiring team,\n\nI am interested in the ${targetTitle} role at ${company}. As ${priorTitle} at ${priorCompany}, I have applied ${topSkill} to solve production problems with clear ownership and steady delivery. ${summarySnippet} That background positions me to add value quickly in a role that requires both ${jdKeyword} and sound judgment under real constraints.",
    },
    {
      id: "opening-grounded",
      label: "Grounded",
      text: "Dear ${company} hiring team,\n\nI would like to be considered for ${targetTitle} at ${company}. My professional journey has progressed through ${priorTitle} roles where ${topSkill} was central to how I scoped work, partnered across teams, and shipped reliably. ${summarySnippet} I see a strong fit with your needs around ${jdKeyword} and ${jdKeyword2}.",
    },
  ],

  experienceBlocks: [
    {
      id: "experience-impact",
      label: "Impact-led",
      text: "In my work as ${priorTitle} at ${priorCompany}, I focused on outcomes that matter to the business, not activity for its own sake. ${achievementLine} That work required depth in ${topSkill} and close partnership with product and operations stakeholders.\n\nAcross recent roles I have also strengthened capabilities in ${secondSkill} and ${thirdSkill}, which your description ties directly to ${jdKeyword}. I am comfortable owning problems end to end: clarifying requirements, making tradeoffs explicit, improving reliability, and leaving systems easier to run than I found them. I measure success by whether the team can sustain the solution after launch.",
    },
    {
      id: "experience-fit",
      label: "Requirements fit",
      text: "Your posting highlights ${jdKeyword} and ${jdKeyword2}. Those are areas where I have recent, hands-on experience. As ${priorTitle}, I used ${topSkill} to deliver work that held up under production load, and I paired it with ${secondSkill} and ${thirdSkill} when the problem required a broader toolkit.\n\n${achievementLine} I bring the same standard to new environments: document decisions, align stakeholders early, and measure progress in terms the business can see.",
    },
    {
      id: "experience-leadership",
      label: "Ownership",
      text: "What draws me to ${targetTitle} is the scope to combine technical depth with accountable delivery. At ${priorCompany}, serving as ${priorTitle}, I led initiatives where ${topSkill} was the through-line — from design through rollout and follow-through. ${achievementLine}\n\nI have also built fluency in ${secondSkill} and ${thirdSkill}, which supports the cross-functional work your team describes. I work best when expectations are clear, feedback is direct, and quality is treated as a shared responsibility.",
    },
  ],

  whyCompany: [
    {
      id: "why-mission",
      label: "Mission fit",
      text: "${company} stands out because of the problems you choose to solve and the standard you apply while solving them. The ${targetTitle} role sits at the intersection of ${jdKeyword} and meaningful product impact — the kind of work where ${topSkill} is not a buzzword but a daily practice. I am motivated by teams that value clarity, craft, and steady improvement over hype, and I believe that mindset shows up in how you describe this position.",
    },
    {
      id: "why-product",
      label: "Product fit",
      text: "I am particularly interested in ${company} because the ${targetTitle} position appears to own outcomes that connect engineering quality to customer value. Posts that emphasize ${jdKeyword} and ${jdKeyword2} usually signal teams that understand operational reality, not just roadmap slides. That is the environment where I do my best work: informed debate, practical decisions, and follow-through.",
    },
    {
      id: "why-growth",
      label: "Growth fit",
      text: "Joining ${company} would let me apply a ${priorTitle} foundation to problems with broader reach. Your focus on ${jdKeyword} matches where I have invested recent years, and the ${targetTitle} mandate reads like a natural next step in my journey — more scope, higher stakes, and the chance to raise the bar for how ${topSkill} is practiced on the team.",
    },
  ],

  closings: [
    {
      id: "closing-confident",
      label: "Confident",
      text: "I would welcome a conversation about how my experience as ${priorTitle} and my strength in ${topSkill} can support ${company}'s goals for this role. Thank you for your time and consideration.",
    },
    {
      id: "closing-forward",
      label: "Forward",
      text: "If helpful, I can share specific examples where ${topSkill}, ${secondSkill}, and ${thirdSkill} translated into results relevant to ${targetTitle}. I appreciate your review and am available to speak at your convenience.",
    },
    {
      id: "closing-measured",
      label: "Measured",
      text: "I am confident I can contribute early and grow with the demands of the role. I would be glad to discuss fit in more detail. Thank you for considering my application to ${company}.",
    },
  ],
} as const satisfies CoverLetterTemplateMatrix;

/** @deprecated Use experienceBlocks — kept for migration references */
export const bodyAlignments = COVER_LETTER_TEMPLATE_MATRIX.experienceBlocks;

// ─── Render helpers ───────────────────────────────────────────────────────────

const PLACEHOLDER_PATTERN = /\$\{(\w+)\}/g;

export function renderCoverLetterBlock(
  template: string,
  placeholders: CoverLetterTemplatePlaceholders,
): string {
  return template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    if (key in placeholders && placeholders[key as keyof CoverLetterTemplatePlaceholders] != null) {
      return placeholders[key as keyof CoverLetterTemplatePlaceholders] as string;
    }
    return match;
  });
}

export type CoverLetterComposition = {
  openingId: string;
  experienceBlockId: string;
  whyCompanyId: string;
  closingId: string;
  /** @deprecated Use experienceBlockId */
  bodyAlignmentId?: string;
};

export function findCoverLetterBlock(
  tier: CoverLetterTemplateTier,
  id: string,
): CoverLetterProseBlock | undefined {
  return COVER_LETTER_TEMPLATE_MATRIX[tier].find((block) => block.id === id);
}

export function composeCoverLetterFromMatrix(
  selection: CoverLetterComposition,
  placeholders: CoverLetterTemplatePlaceholders,
): string | null {
  const experienceId = selection.experienceBlockId ?? selection.bodyAlignmentId;
  const opening = findCoverLetterBlock("openings", selection.openingId);
  const experience = experienceId
    ? findCoverLetterBlock("experienceBlocks", experienceId)
    : undefined;
  const why = findCoverLetterBlock("whyCompany", selection.whyCompanyId);
  const closing = findCoverLetterBlock("closings", selection.closingId);

  if (!opening || !experience || !why || !closing) return null;

  return [
    renderCoverLetterBlock(opening.text, placeholders),
    renderCoverLetterBlock(experience.text, placeholders),
    renderCoverLetterBlock(why.text, placeholders),
    renderCoverLetterBlock(closing.text, placeholders),
  ].join("\n\n");
}

export const DEFAULT_COVER_LETTER_COMPOSITION: CoverLetterComposition = {
  openingId: COVER_LETTER_TEMPLATE_MATRIX.openings[0].id,
  experienceBlockId: COVER_LETTER_TEMPLATE_MATRIX.experienceBlocks[0].id,
  whyCompanyId: COVER_LETTER_TEMPLATE_MATRIX.whyCompany[0].id,
  closingId: COVER_LETTER_TEMPLATE_MATRIX.closings[0].id,
};

export {
  COVER_LETTER_WORD_TARGET as DETERMINISTIC_COVER_LETTER_WORD_TARGET,
  countCoverLetterWords as countTemplateWords,
} from "@/lib/job-tracker/cover-letter-constants";
