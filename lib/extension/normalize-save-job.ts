import {
  MAX_JOB_DESCRIPTION_CHARS,
  type SaveJobTrackerInput,
} from "@/lib/extension/job-service";
import { canApplyCapture } from "@/src/shared/extension/apply-gate";
import { resolveJobIdentity } from "@/src/shared/extension/job-identity";

export type NormalizedSaveJobInput = Omit<SaveJobTrackerInput, "title" | "company"> & {
  title: string;
  company: string | null;
  identitySources: {
    title: string;
    company: string | null;
  };
};

/** Layer B — URL + description required; title/company derived when missing. */
export function normalizeSaveJobInput(
  input: SaveJobTrackerInput,
): NormalizedSaveJobInput | { error: string } {
  const url = input.url?.trim() ?? "";
  const description = (input.description?.trim() ?? "").slice(0, MAX_JOB_DESCRIPTION_CHARS);

  if (!canApplyCapture({ url, description })) {
    return { error: "url and job description (min 120 chars) are required" };
  }

  const identity = resolveJobIdentity({
    url,
    title: input.title,
    company: input.company,
    description,
  });

  const title = input.title?.trim() || identity.title;
  const company = input.company?.trim() || identity.company;

  const existingMeta =
    input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {};

  return {
    url,
    title,
    company: company || null,
    location: input.location?.trim() || null,
    salaryText: input.salaryText?.trim() || null,
    description,
    platform: input.platform?.trim() || null,
    sourceProfileId: input.sourceProfileId?.trim() || null,
    metadata: {
      ...existingMeta,
      identitySources: {
        title: identity.titleSource,
        company: identity.companySource,
      },
    },
    identitySources: {
      title: identity.titleSource,
      company: identity.companySource,
    },
  };
}
