import type { Resume } from "@/lib/resume/openResume/types";
import type { ResumeSectionToLines } from "@/lib/resume/openResume/types";
import { extractProfile } from "@/lib/resume/openResume/extract-resume-from-sections/extract-profile";
import { extractEducation } from "@/lib/resume/openResume/extract-resume-from-sections/extract-education";
import { extractWorkExperience } from "@/lib/resume/openResume/extract-resume-from-sections/extract-work-experience";
import { extractProject } from "@/lib/resume/openResume/extract-resume-from-sections/extract-project";
import { extractSkills } from "@/lib/resume/openResume/extract-resume-from-sections/extract-skills";
import { extractCertifications } from "@/lib/resume/openResume/extract-resume-from-sections/extract-certifications";
import { parseQualificationBullets } from "@/lib/resume/openResume/extract-resume-from-sections/parse-qualification-bullets";
import {
  getBulletPointsFromLines,
  getDescriptionsLineIdx,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/bullet-points";
import { getSectionLinesByKeywords } from "@/lib/resume/openResume/extract-resume-from-sections/lib/get-section-lines";

/**
 * Step 4. Extract resume from sections.
 *
 * This is the core of the resume parser to resume information from the sections.
 *
 * The gist of the extraction engine is a feature scoring system. Each resume attribute
 * to be extracted has a custom feature sets, where each feature set consists of a
 * feature matching function and a feature matching score if matched (feature matching
 * score can be a positive or negative number). To compute the final feature score of
 * a text item for a particular resume attribute, it would run the text item through
 * all its feature sets and sum up the matching feature scores. This process is carried
 * out for all text items within the section, and the text item with the highest computed
 * feature score is identified as the extracted resume attribute.
 */
export const extractResumeFromSections = (
  sections: ResumeSectionToLines
): Resume => {
  const { profile } = extractProfile(sections);
  const { educations } = extractEducation(sections);
  const { workExperiences } = extractWorkExperience(sections);
  const { projects } = extractProject(sections);
  const { skills } = extractSkills(sections);
  let certifications = extractCertifications(sections);

  const qualificationLines = getSectionLinesByKeywords(sections, [
    "education",
    "certification",
    "qualification",
  ]);
  const qualBulletIdx = getDescriptionsLineIdx(qualificationLines) ?? 0;
  const qualBullets = getBulletPointsFromLines(
    qualificationLines.slice(qualBulletIdx),
  );

  if (qualBullets.length > 0) {
    const parsed = parseQualificationBullets(qualBullets);
    if (parsed.educations.length > 0) {
      educations.length = 0;
      educations.push(...parsed.educations);
    }
    if (parsed.certifications.length > 0) {
      certifications = parsed.certifications;
    }
    if (parsed.skills.length > 0) {
      skills.descriptions.push(...parsed.skills);
    }
  }

  return {
    profile,
    educations,
    workExperiences,
    projects,
    skills,
    custom: {
      descriptions: certifications,
    },
  };
};
