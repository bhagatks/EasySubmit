import type { StructuredResume } from "@/lib/resume/heuristicParser";
import type { Resume } from "@/lib/resume/openResume/types";
import { normalizeStructuredResume } from "@/lib/resume/normalizeResumeText";

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/** Map Open-Resume Resume model to EasySubmit StructuredResume. */
export function openResumeToStructured(resume: Resume): StructuredResume {
  const featuredSkills = resume.skills.featuredSkills
    .map((entry) => entry.skill.trim())
    .filter(Boolean);

  const descriptionSkills = resume.skills.descriptions
    .flatMap((line) => {
      if (line.includes(":") && line.length > 60) {
        const label = line.split(":")[0]?.trim();
        return label ? [label] : [];
      }
      return line
        .split(/[,;|•·\/]|\s{2,}/)
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 1 && skill.length < 60);
    });

  const skills = Array.from(new Set([...featuredSkills, ...descriptionSkills])).slice(
    0,
    40,
  );

  const projectDescriptions = resume.projects.flatMap((project) =>
    [
      project.project,
      ...project.descriptions,
    ].filter((line) => line.trim()),
  );

  return normalizeStructuredResume({
    name: resume.profile.name?.trim() || null,
    email: resume.profile.email?.trim() || null,
    phone: resume.profile.phone?.trim() || null,
    location: resume.profile.location?.trim() || null,
    linkedIn: resume.profile.url?.trim() || null,
    summary: resume.profile.summary?.trim() || null,
    experience: resume.workExperiences
      .filter(
        (entry) =>
          entry.company.trim() ||
          entry.jobTitle.trim() ||
          entry.descriptions.length > 0,
      )
      .map((entry) => ({
        company: entry.company.trim(),
        role: entry.jobTitle.trim(),
        date: entry.date.trim(),
        description: entry.descriptions.filter((line) => line.trim()),
      })),
    education: resume.educations
      .filter((entry) => entry.school.trim() || entry.degree.trim())
      .map((entry) => ({
        school: entry.school.trim(),
        degree: entry.degree.trim(),
        date: entry.date.trim(),
      })),
    skills,
    certifications: resume.custom.descriptions.filter((line) => line.trim()),
    projects: projectDescriptions,
    languages: [],
  });
}

export function structuredFullName(data: StructuredResume): string {
  if (data.name?.trim()) return data.name.trim();
  return "";
}
