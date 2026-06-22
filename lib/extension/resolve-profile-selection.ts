import type { ResumeProfilePickerMode } from "@/lib/generated/prisma/client";

export type ExtensionResumeProfileOption = {
  id: string;
  label: string;
  isDefault: boolean;
};

export type ExtensionResumeProfilesPayload = {
  profiles: ExtensionResumeProfileOption[];
  pickerMode: ResumeProfilePickerMode;
  defaultProfileId: string | null;
};

export function resolveExtensionProfileSelection(
  payload: ExtensionResumeProfilesPayload,
  lastSelectedProfileId: string | null,
): string | null {
  if (payload.profiles.length === 0) return null;

  if (payload.pickerMode === "LAST_SELECTED" && lastSelectedProfileId) {
    const match = payload.profiles.find((p) => p.id === lastSelectedProfileId);
    if (match) return match.id;
  }

  return payload.defaultProfileId;
}
