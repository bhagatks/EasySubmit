import type { Prisma } from "@/lib/generated/prisma/client";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { findProfileForUser } from "@/lib/profile/resume-profile-core";
import { sanitizeString } from "@/lib/profile/sanitize";
import {
  hubFormToProfileContent,
  studioSkillsFromForm,
} from "@/lib/profile/studio-form-db";
import { prisma } from "@/lib/prisma";

function parseCityState(cityState: string): { city: string; country: string } {
  const trimmed = cityState.trim();
  if (!trimmed) return { city: "", country: "" };

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length >= 2) {
    return { city: parts[0], country: parts.slice(1).join(", ") };
  }

  return { city: trimmed, country: "" };
}

export type PersistProfileFromFormResult =
  | { success: true; profileId: string }
  | { success: false; error: string; code?: "not_found" | "invalid_title" | "persist_failed" };

/** Server-side profile persist (extension pipeline + bearer flows). */
export async function persistProfileFromForm(
  userId: string,
  profileId: string,
  targetTitle: string,
  form: HubRefineryForm,
): Promise<PersistProfileFromFormResult> {
  const normalizedTitle = sanitizeString(targetTitle, 160);
  if (!normalizedTitle) {
    return {
      success: false,
      error: "Target role is required to save this profile",
      code: "invalid_title",
    };
  }

  const profile = await findProfileForUser(userId, profileId);
  if (!profile) {
    return { success: false, error: "Profile not found", code: "not_found" };
  }

  const skills = studioSkillsFromForm(form);
  const { city, country } = parseCityState(form.cityState);

  try {
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        firstName: sanitizeString(form.firstName, 80) || null,
        lastName: sanitizeString(form.lastName, 80) || null,
        email: sanitizeString(form.email, 200) || profile.email,
        phone: sanitizeString(form.phone, 40) || null,
        city: sanitizeString(city, 120) || null,
        country: sanitizeString(country, 120) || null,
        targetTitle: normalizedTitle,
        summary: sanitizeString(form.professionalSummary, 8000) || null,
        skills,
        content: hubFormToProfileContent(form, skills) as Prisma.InputJsonValue,
      },
    });

    return { success: true, profileId: profile.id };
  } catch {
    return { success: false, error: "Failed to save profile", code: "persist_failed" };
  }
}
