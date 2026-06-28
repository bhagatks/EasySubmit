export const SETTINGS_SECTION_IDS = ["account", "ai-keys", "general"] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export type SettingsActionItemId =
  | "add-api-key"
  | "enable-ai-enhancements"
  | "complete-profile-name";

export type SettingsActionItem = {
  id: SettingsActionItemId;
  sectionId: SettingsSectionId;
  label: string;
};

export type SettingsActionItemsInput = {
  vaultKeyId: string | null;
  aiSourcePreference: string;
  firstName: string | null;
  aiGloballyEnabled?: boolean;
};

/** Pending setup tasks surfaced on the Settings screen. */
export function resolveSettingsActionItems(
  input: SettingsActionItemsInput,
): SettingsActionItem[] {
  const items: SettingsActionItem[] = [];
  const aiGloballyEnabled = input.aiGloballyEnabled ?? true;

  if (!(input.firstName ?? "").trim()) {
    items.push({
      id: "complete-profile-name",
      sectionId: "account",
      label: "Add your first name",
    });
  }

  if (!aiGloballyEnabled) {
    return items;
  }

  if (input.aiSourcePreference === "disabled") {
    items.push({
      id: "enable-ai-enhancements",
      sectionId: "ai-keys",
      label: "Turn on AI enhancements",
    });
  }

  if (!input.vaultKeyId) {
    items.push({
      id: "add-api-key",
      sectionId: "ai-keys",
      label: "Add your API key",
    });
  }

  return items;
}

/** Sections with pending actions start expanded; others stay collapsed. */
export function buildSettingsSectionExpansion(
  sectionIds: readonly string[],
  actionItems: SettingsActionItem[],
): Record<string, boolean> {
  const sectionsWithActions = new Set(actionItems.map((item) => item.sectionId));

  return Object.fromEntries(
    sectionIds.map((id) => [id, sectionsWithActions.has(id as SettingsSectionId)]),
  );
}

export function settingsSectionHasActionItems(
  sectionId: SettingsSectionId,
  actionItems: SettingsActionItem[],
): boolean {
  return actionItems.some((item) => item.sectionId === sectionId);
}
