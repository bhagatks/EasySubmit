export type ResumeDetailDraft = {
  targetTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState: string;
  linkedIn: string;
  professionalSummary: string;
  skillsText: string;
};

export type ResumeDetailFormResponse = ResumeDetailDraft;

export function buildResumeDetailDraft(input: {
  targetTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState: string;
  linkedIn: string;
  professionalSummary: string;
  skillsText: string;
}): ResumeDetailDraft {
  return {
    targetTitle: input.targetTitle,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    cityState: input.cityState,
    linkedIn: input.linkedIn,
    professionalSummary: input.professionalSummary,
    skillsText: input.skillsText,
  };
}

export function normalizeResumeDetailDraft(draft: ResumeDetailDraft): ResumeDetailDraft {
  return {
    targetTitle: draft.targetTitle.trim(),
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    cityState: draft.cityState.trim(),
    linkedIn: draft.linkedIn.trim(),
    professionalSummary: draft.professionalSummary.trim(),
    skillsText: draft.skillsText.trim(),
  };
}

export function resumeDetailDraftsEqual(a: ResumeDetailDraft, b: ResumeDetailDraft): boolean {
  const left = normalizeResumeDetailDraft(a);
  const right = normalizeResumeDetailDraft(b);
  return (
    left.targetTitle === right.targetTitle &&
    left.firstName === right.firstName &&
    left.lastName === right.lastName &&
    left.email === right.email &&
    left.phone === right.phone &&
    left.cityState === right.cityState &&
    left.linkedIn === right.linkedIn &&
    left.professionalSummary === right.professionalSummary &&
    left.skillsText === right.skillsText
  );
}

export const RESUME_DETAIL_FIELD_KEYS = [
  "targetTitle",
  "firstName",
  "lastName",
  "email",
  "phone",
  "cityState",
  "linkedIn",
] as const;

export type ResumeDetailScalarFieldKey = (typeof RESUME_DETAIL_FIELD_KEYS)[number];

export const RESUME_DETAIL_FIELD_LABELS: Record<ResumeDetailScalarFieldKey, string> = {
  targetTitle: "Target title",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  cityState: "Location",
  linkedIn: "LinkedIn",
};

export const RESUME_DETAIL_TEXTAREA_KEYS = ["professionalSummary", "skillsText"] as const;

export type ResumeDetailTextareaKey = (typeof RESUME_DETAIL_TEXTAREA_KEYS)[number];

export const RESUME_DETAIL_TEXTAREA_LABELS: Record<ResumeDetailTextareaKey, string> = {
  professionalSummary: "Professional summary",
  skillsText: "Skills",
};

export function mergedFormToResumeDetailDraft(
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cityState: string;
    linkedIn: string;
    professionalSummary: string;
    skillsText: string;
  },
  targetTitle: string,
): ResumeDetailDraft {
  return buildResumeDetailDraft({
    targetTitle,
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    cityState: form.cityState,
    linkedIn: form.linkedIn,
    professionalSummary: form.professionalSummary,
    skillsText: form.skillsText,
  });
}

export function applyResumeDetailDraftToForm<T extends {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState: string;
  linkedIn: string;
  professionalSummary: string;
  skillsText: string;
}>(form: T, draft: ResumeDetailDraft): T {
  return {
    ...form,
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email,
    phone: draft.phone,
    cityState: draft.cityState,
    linkedIn: draft.linkedIn,
    professionalSummary: draft.professionalSummary,
    skillsText: draft.skillsText,
  };
}
