import type { ResumeSkills } from "@/lib/resume/openResume/types";
import type { ResumeSectionToLines } from "@/lib/resume/openResume/types";
import { deepClone } from "@/lib/resume/openResume/deep-clone";
import { getSectionLinesByKeywords } from "@/lib/resume/openResume/extract-resume-from-sections/lib/get-section-lines";
import { initialFeaturedSkills } from "@/lib/resume/openResume/constants";
import {
  getBulletPointsFromLines,
  getDescriptionsLineIdx,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/bullet-points";

export const extractSkills = (sections: ResumeSectionToLines) => {
  const lines = getSectionLinesByKeywords(sections, [
    "skill",
    "competenc",
    "toolkit",
  ]);

  let descriptionsLineIdx = getDescriptionsLineIdx(lines);
  if (descriptionsLineIdx === undefined && lines.length > 0) {
    descriptionsLineIdx = 0;
  }
  descriptionsLineIdx = descriptionsLineIdx ?? 0;

  const descriptionsLines = lines.slice(descriptionsLineIdx);
  let descriptions = getBulletPointsFromLines(descriptionsLines);

  if (descriptions.length === 0) {
    const profileLines = sections.profile ?? [];
    descriptions = getBulletPointsFromLines(profileLines.slice(2))
      .map((bullet) => bullet.split(":")[0]?.trim() ?? bullet.trim())
      .filter((bullet) => bullet.length > 2 && bullet.length <= 60);
  }

  const featuredSkills = deepClone(initialFeaturedSkills);
  if (descriptionsLineIdx !== 0) {
    const featuredSkillsLines = lines.slice(0, descriptionsLineIdx);
    const featuredSkillsTextItems = featuredSkillsLines
      .flat()
      .filter((item) => item.text.trim())
      .slice(0, 6);
    for (let i = 0; i < featuredSkillsTextItems.length; i++) {
      featuredSkills[i].skill = featuredSkillsTextItems[i].text;
    }
  }

  const skills: ResumeSkills = {
    featuredSkills,
    descriptions,
  };

  return { skills };
};
