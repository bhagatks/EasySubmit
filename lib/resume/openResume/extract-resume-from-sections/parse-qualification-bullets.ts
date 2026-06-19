import type { ResumeEducation } from "@/lib/resume/openResume/types";

const EDUCATION_PATTERN =
  /\b(bachelor|master|associate|ph\.?d|b\.?\s*tech|m\.?\s*tech|b\.?\s*s\.?|m\.?\s*s\.?|degree|diploma)\b|university|college|institute of/i;

const CERTIFICATION_PATTERN =
  /\b(certified|certification|certificate|credential|aws|pmp|cpa|professional education)\b/i;

const SKILLS_TOOLKIT_PATTERN = /\b(toolkit|competencies|technical skills|core skills)\b/i;

function parseEducationBullet(text: string): ResumeEducation {
  const trimmed = text.trim();
  const pipeParts = trimmed.split("|").map((part) => part.trim());
  const degree = pipeParts[0] ?? trimmed;
  const school = pipeParts[1] ?? "";
  const yearMatch = trimmed.match(/\((\d{4})\)\s*$/);

  return {
    degree,
    school,
    date: yearMatch?.[1] ?? "",
    gpa: "",
    descriptions: [],
  };
}

function extractSkillsFromToolkit(text: string): string[] {
  const colonIdx = text.indexOf(":");
  const payload = colonIdx >= 0 ? text.slice(colonIdx + 1) : text;
  return payload
    .split(/[,;|•·]/)
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 1 && skill.length < 80);
}

export function parseQualificationBullets(bullets: string[]): {
  educations: ResumeEducation[];
  certifications: string[];
  skills: string[];
} {
  const educations: ResumeEducation[] = [];
  const certifications: string[] = [];
  const skills: string[] = [];

  for (const bullet of bullets) {
    const text = bullet.trim();
    if (!text) continue;

    if (SKILLS_TOOLKIT_PATTERN.test(text)) {
      skills.push(...extractSkillsFromToolkit(text));
      continue;
    }

    if (EDUCATION_PATTERN.test(text) && !CERTIFICATION_PATTERN.test(text)) {
      educations.push(parseEducationBullet(text));
      continue;
    }

    if (CERTIFICATION_PATTERN.test(text)) {
      certifications.push(text);
      continue;
    }

    if (/university|college|institute/i.test(text)) {
      educations.push(parseEducationBullet(text));
      continue;
    }

    certifications.push(text);
  }

  return { educations, certifications, skills };
}
