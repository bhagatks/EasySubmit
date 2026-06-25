import type { ApplicationProfile } from "@/lib/profile/application-profile";

export type ApplicationProfileScreen1Input = {
  authorized: string;
  authorizedCountry: string;
  requiresSponsorship: string;
  salaryMin: string;
  salaryMax: string;
  earliestStart: string;
  workMode: string;
};

export type ApplicationProfileScreen2Input = {
  gender: string;
  veteran: string;
  disability: string;
};

const EEO_LABELS: Record<string, string> = {
  prefer_not_to_say: "Prefer not to say",
  woman: "Woman",
  man: "Man",
  non_binary: "Non-binary",
  not_veteran: "I am not a protected veteran",
  veteran: "I am a protected veteran",
  no: "No",
  yes: "Yes",
};

function eeoLabel(value: string): string {
  return EEO_LABELS[value] ?? value;
}

export function applicationProfilePatchFromScreen1(
  draft: ApplicationProfileScreen1Input,
): Partial<ApplicationProfile> {
  const parsedMin = Number.parseInt(draft.salaryMin, 10);
  const parsedMax = Number.parseInt(draft.salaryMax, 10);
  const min = Number.isFinite(parsedMin) ? parsedMin : 0;
  const max = Number.isFinite(parsedMax) ? parsedMax : min;

  return {
    workAuth: {
      authorized: draft.authorized === "yes",
      authorizedCountry: draft.authorizedCountry.trim() || "US",
      requiresSponsorship: draft.requiresSponsorship === "yes",
    },
    preferences: {
      salary: { min, max, currency: "USD", signals: [] },
      earliestStart: draft.earliestStart as NonNullable<
        ApplicationProfile["preferences"]
      >["earliestStart"],
      workMode: draft.workMode as NonNullable<ApplicationProfile["preferences"]>["workMode"],
    },
  };
}

export function applicationProfilePatchFromScreen2(
  draft: ApplicationProfileScreen2Input,
  skipAll = false,
): Partial<ApplicationProfile> {
  if (skipAll) {
    return {
      eeo: {
        gender: "Prefer not to say",
        veteran: "Prefer not to say",
        disability: "Prefer not to say",
      },
    };
  }

  return {
    eeo: {
      gender: eeoLabel(draft.gender),
      veteran: eeoLabel(draft.veteran),
      disability: eeoLabel(draft.disability),
    },
  };
}

export function syncProfileSetupDraftsFromProfile(profile: ApplicationProfile | null): {
  screen1: ApplicationProfileScreen1Input;
  screen2: ApplicationProfileScreen2Input;
} {
  const screen1: ApplicationProfileScreen1Input = {
    authorized: profile?.workAuth?.authorized === false ? "no" : "yes",
    authorizedCountry: profile?.workAuth?.authorizedCountry ?? "US",
    requiresSponsorship: profile?.workAuth?.requiresSponsorship ? "yes" : "no",
    salaryMin: profile?.preferences?.salary?.min ? String(profile.preferences.salary.min) : "",
    salaryMax: profile?.preferences?.salary?.max ? String(profile.preferences.salary.max) : "",
    earliestStart: profile?.preferences?.earliestStart ?? "2_weeks",
    workMode: profile?.preferences?.workMode ?? "flexible",
  };

  const reverseEeo = (stored: string | undefined, fallback: string): string => {
    if (!stored) return fallback;
    const entry = Object.entries(EEO_LABELS).find(([, label]) => label === stored);
    return entry?.[0] ?? fallback;
  };

  const screen2: ApplicationProfileScreen2Input = {
    gender: reverseEeo(profile?.eeo?.gender, "prefer_not_to_say"),
    veteran: reverseEeo(profile?.eeo?.veteran, "prefer_not_to_say"),
    disability: reverseEeo(profile?.eeo?.disability, "prefer_not_to_say"),
  };

  return { screen1, screen2 };
}

export function emptyApplicationProfile(): ApplicationProfile {
  return {
    workAuth: null,
    preferences: null,
    address: null,
    eeo: null,
  };
}

/** Screen 1 complete — work auth + preferences required before autofill uses profile. */
export function isApplicationProfileSetupComplete(
  profile: ApplicationProfile | null | undefined,
): boolean {
  return Boolean(profile?.workAuth && profile?.preferences);
}

export function mergeApplicationProfile(
  current: ApplicationProfile | null,
  patch: Partial<ApplicationProfile>,
): ApplicationProfile {
  const base = current ?? emptyApplicationProfile();
  return {
    workAuth: patch.workAuth !== undefined ? patch.workAuth : base.workAuth,
    preferences: patch.preferences !== undefined ? patch.preferences : base.preferences,
    address: patch.address !== undefined ? patch.address : base.address,
    eeo: patch.eeo !== undefined ? patch.eeo : base.eeo,
  };
}
