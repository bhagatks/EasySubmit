export const SKILLS_BANNED_SLOT_WASTERS: string[] = [
  "communication",
  "teamwork",
  "hard worker",
  "attention to detail",
  "time management",
  "adaptability",
  "creativity",
  "positive attitude",
  "fast learner",
  "multitasking",
  "problem solving",
  "leadership",
  "collaboration",
  "motivated",
  "organized",
  "flexible",
  "detail-oriented",
  "people skills",
  "interpersonal skills",
  "work ethic",
];

export const SKILLS_HARD_MIN_MANUAL = 6;
export const SKILLS_HARD_MIN_SYSTEM = 15;
export const SKILLS_TARGET_MIN = 10;
export const SKILLS_TARGET_MAX = 15;
export const SKILLS_SOFT_MAX = 15;
export const SKILLS_HARD_MAX = 20;

const PROSE_SKILL_VERBS =
  /\b(is|are|was|have|has|build|manage|lead|develop|design|create|drive|deliver|support|enable|ensure|help|use|work)\b/i;

export function parseSkillsText(text: string): string[] {
  return text
    .split(/[,;\n|•·\/]+/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export function joinSkillsText(skills: string[]): string {
  return skills.join(", ");
}

function normalizeSkillToken(skill: string): string {
  return skill.trim().toLowerCase().replace(/-/g, " ");
}

export function isBannedSkill(skill: string): boolean {
  const normalized = normalizeSkillToken(skill);
  return SKILLS_BANNED_SLOT_WASTERS.some((banned) => {
    const bannedNormalized = normalizeSkillToken(banned);
    return normalized === bannedNormalized;
  });
}

export function isProseSkill(skill: string): boolean {
  const trimmed = skill.trim();
  if (!trimmed) return false;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 4) return true;

  return PROSE_SKILL_VERBS.test(trimmed);
}

export function findBannedSkills(skills: string[]): string[] {
  return skills.filter((skill) => isBannedSkill(skill));
}

export type SkillsManualValidation = {
  count: number;
  banned: string[];
  countWarning: string | null;
};

export type SkillsSystemValidation = {
  count: number;
  banned: string[];
  countWarning: string | null;
  compositionWarning: string | null;
};

export function validateSkillsManual(skills: string[]): SkillsManualValidation {
  const count = skills.length;
  const banned = findBannedSkills(skills);

  let countWarning: string | null = null;
  if (count < SKILLS_HARD_MIN_MANUAL) {
    countWarning = "Add at least 6 skills.";
  } else if (count > SKILLS_HARD_MAX) {
    countWarning = "Too many skills — keep it to 20 or fewer.";
  }

  return { count, banned, countWarning };
}

export function validateSkillsSystem(skills: string[]): SkillsSystemValidation {
  const count = skills.length;
  const banned = findBannedSkills(skills);

  let countWarning: string | null = null;
  if (count < SKILLS_HARD_MIN_SYSTEM) {
    countWarning =
      "Skills below target — add more role-specific skills (target: 15–20).";
  } else if (count > SKILLS_HARD_MAX) {
    countWarning = "Too many skills — trim to 20.";
  }

  const compositionWarning =
    count === 0 || banned.length / count <= 0.3
      ? null
      : "Skills section contains too many generic soft skills.";

  return { count, banned, countWarning, compositionWarning };
}
