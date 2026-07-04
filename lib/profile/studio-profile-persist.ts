import type { Prisma } from "@/lib/generated/prisma/client";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  hubFormToProfileContent,
  normalizeLinkedInForStorage,
} from "@/lib/profile/studio-form-db";
import { sanitizeEmail, sanitizeString } from "@/lib/profile/sanitize";

function parseCityState(cityState: string): { city: string; country: string } {
  const trimmed = cityState.trim();
  if (!trimmed) return { city: "", country: "" };

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length >= 2) {
    return { city: parts[0], country: parts.slice(1).join(", ") };
  }

  return { city: trimmed, country: "" };
}

export type ResumeProfileStudioPersistPayload = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  targetTitle: string;
  summary: string | null;
  skills: string[];
  content: Prisma.InputJsonValue;
};

export function buildResumeProfileStudioPersistPayload(input: {
  form: HubRefineryForm;
  targetTitle: string;
  skills: string[];
  fallbackEmail: string;
}): ResumeProfileStudioPersistPayload {
  const form: HubRefineryForm = {
    ...input.form,
    email: input.form.email.trim(),
    linkedIn: normalizeLinkedInForStorage(input.form.linkedIn),
  };
  const { city, country } = parseCityState(form.cityState);
  const email =
    sanitizeEmail(form.email) ??
    sanitizeEmail(input.fallbackEmail) ??
    input.fallbackEmail.trim();

  return {
    firstName: sanitizeString(form.firstName, 80),
    lastName: sanitizeString(form.lastName, 80),
    email,
    phone: sanitizeString(form.phone, 40),
    city: sanitizeString(city, 120),
    country: sanitizeString(country, 120),
    targetTitle: sanitizeString(input.targetTitle, 160) ?? "",
    summary: sanitizeString(form.professionalSummary, 8000),
    skills: input.skills,
    content: hubFormToProfileContent(form, input.skills) as Prisma.InputJsonValue,
  };
}
