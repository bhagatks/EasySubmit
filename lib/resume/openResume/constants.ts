import type { FeaturedSkill } from "@/lib/resume/openResume/types";

export const initialFeaturedSkill: FeaturedSkill = { skill: "", rating: 4 };

export const initialFeaturedSkills: FeaturedSkill[] = Array.from(
  { length: 6 },
  () => ({ ...initialFeaturedSkill }),
);
