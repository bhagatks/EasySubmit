"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FileText,
  Link2,
  Loader2,
  Sparkles,
  User,
  Zap,
  Archive,
} from "lucide-react";
import {
  type AccountSettingsSnapshot,
  type AuthProviderId,
  updateLoginProfile,
  updateAutoApplyUserSwitch,
  updateAutoArchiveAppliedJobs,
  updateResumeProfilePickerMode,
} from "@/app/actions/account";
import type { VaultedApiKeySummary } from "@/app/actions/ai/vault-key";
import type { ResumeProfilePickerMode } from "@/lib/generated/prisma/client";
import { updateAiSourcePreference } from "@/app/actions/ai/enhance-resume";
import { updateSystemAiSetting } from "@/app/actions/user/update-system-ai-setting";
import {
  LegalDocumentLink,
  useLegalDocumentOverlay,
} from "@/components/legal/legal-document-overlay";
import { AiSettingsPanel } from "@/components/dashboard/AiSettingsPanel";
import { SettingToggleRow } from "@/components/dashboard/SettingToggleRow";
import { AvatarUploadField } from "@/components/profile/avatar-upload-field";
import {
  DashboardExpandAllButton,
  useRegisterDashboardHeaderActions,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import { useWorkspaceSectionExpansion } from "@/lib/dashboard/use-workspace-section-expansion";
import { BYOKKeyHeaderAction } from "@/components/dashboard/BYOKStatus";
import {
  DashboardWorkspacePage,
  DashboardWorkspaceStack,
} from "@/components/dashboard/DashboardWorkspacePage";
import { StudioCollapsibleSection } from "@/components/resume/StudioCollapsibleSection";
import { SettingsVaultKeysPanel } from "@/components/dashboard/SettingsVaultKeysPanel";
import { isClientAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import {
  buildSettingsSectionExpansion,
  resolveSettingsActionItems,
  SETTINGS_SECTION_IDS,
  settingsSectionHasActionItems,
} from "@/lib/dashboard/settings-action-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackSettingsSectionViewed } from "@/src/shared/analytics";
import { cn } from "@/lib/utils";

const PROFILE_SAVE_DEBOUNCE_MS = 600;

type AccountSettingsProps = {
  initial: AccountSettingsSnapshot;
  initialVaultKeys: VaultedApiKeySummary[];
};

type ProviderMeta = {
  id: AuthProviderId;
  label: string;
};

const AUTH_PROVIDERS: ProviderMeta[] = [
  { id: "google", label: "Google" },
  { id: "linkedin", label: "LinkedIn" },
];

const PROFILE_PICKER_OPTIONS = [
  { value: "DEFAULT" as const, label: "Default", hint: "Your default profile" },
  { value: "LAST_SELECTED" as const, label: "Last used", hint: "From extension card" },
];

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  name,
}: {
  value: T;
  options: Array<{ value: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
  name: string;
}) {
  return (
    <div
      className="grid gap-1 rounded-xl border border-border/80 bg-muted/20 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={name}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg px-2 py-2 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-surface text-foreground shadow-sm ring-2 ring-primary/55 border border-primary/35"
                : "text-muted-foreground hover:text-foreground border border-transparent",
            )}
          >
            <span className="block text-xs font-medium sm:text-sm">{option.label}</span>
            {option.hint ? (
              <span className="mt-0.5 hidden text-[10px] leading-tight text-muted-foreground sm:block">
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ProviderRow({
  provider,
  connected,
  isLastUsed,
  onConnect,
  connecting,
}: {
  provider: ProviderMeta;
  connected: boolean;
  isLastUsed: boolean;
  onConnect: (id: AuthProviderId) => void;
  connecting: AuthProviderId | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{provider.label}</p>
        <p className="text-xs text-muted-foreground">
          {connected ? (isLastUsed ? "Connected · last used" : "Connected") : "Not connected"}
        </p>
      </div>
      {connected ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-mint">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Linked
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={connecting === provider.id}
          onClick={() => onConnect(provider.id)}
          className="h-8 rounded-xl px-2.5"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          {connecting === provider.id ? "…" : "Connect"}
        </Button>
      )}
    </div>
  );
}

export function AccountSettings({ initial, initialVaultKeys }: AccountSettingsProps) {
  const { update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedAiSourceParam = useRef(false);
  const appliedAddKeyParam = useRef(false);
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAddKeyRequestId, setOpenAddKeyRequestId] = useState(0);
  const persistedProfileRef = useRef({
    firstName: (initial.firstName ?? "").trim(),
    lastName: (initial.lastName ?? "").trim(),
  });
  const [connecting, setConnecting] = useState<AuthProviderId | null>(null);
  const [aiEnabled, setAiEnabled] = useState(initial.aiSourcePreference !== "disabled");
  const [aiPrefBusy, setAiPrefBusy] = useState(false);
  const [systemAiEnabled, setSystemAiEnabled] = useState(initial.systemAiEnabled ?? true);
  const [systemAiBusy, setSystemAiBusy] = useState(false);
  const [autoApplyUserSwitch, setAutoApplyUserSwitch] = useState(initial.autoApplyUserSwitch);
  const [autoApplyUserSwitchBusy, setAutoApplyUserSwitchBusy] = useState(false);
  const [autoArchiveAppliedJobs, setAutoArchiveAppliedJobs] = useState(
    initial.autoArchiveAppliedJobs,
  );
  const [autoArchiveBusy, setAutoArchiveBusy] = useState(false);
  const [profilePickerMode, setProfilePickerMode] = useState(initial.resumeProfilePickerMode);
  const [profilePickerBusy, setProfilePickerBusy] = useState(false);
  const [avatarImage, setAvatarImage] = useState(initial.image);
  const { openDocument, overlay, open } = useLegalDocumentOverlay();

  const actionItems = useMemo(
    () =>
      resolveSettingsActionItems({
        vaultKeyId: initial.vaultKeyId,
        aiSourcePreference: initial.aiSourcePreference,
        firstName: initial.firstName,
        aiGloballyEnabled: isClientAiGloballyEnabled(),
      }),
    [initial.aiSourcePreference, initial.firstName, initial.vaultKeyId],
  );

  const defaultExpandedSections = useMemo(
    () => buildSettingsSectionExpansion(SETTINGS_SECTION_IDS, actionItems),
    [actionItems],
  );

  const { expanded, toggleSection, allExpanded, toggleAllSections } =
    useWorkspaceSectionExpansion(
      [...SETTINGS_SECTION_IDS],
      false,
      defaultExpandedSections,
    );

  const loggedSettingsSectionsRef = useRef(new Set<string>());

  useEffect(() => {
    for (const sectionId of SETTINGS_SECTION_IDS) {
      if (!expanded[sectionId] || loggedSettingsSectionsRef.current.has(sectionId)) continue;
      loggedSettingsSectionsRef.current.add(sectionId);
      trackSettingsSectionViewed(sectionId);
    }
  }, [expanded]);

  useEffect(() => {
    if (appliedAiSourceParam.current) return;
    if (searchParams.get("aiSource") !== "auto") return;
    appliedAiSourceParam.current = true;

    if (!expanded["ai-keys"]) {
      toggleSection("ai-keys");
    }

    void (async () => {
      if (initial.aiSourcePreference === "disabled") {
        setAiPrefBusy(true);
        setError(null);
        const result = await updateAiSourcePreference("auto");
        setAiPrefBusy(false);
        if (!result.success) {
          setError(result.error);
        } else {
          setAiEnabled(true);
        }
      }
      router.replace("/dashboard/settings", { scroll: false });
    })();
  }, [expanded, initial.aiSourcePreference, router, searchParams, toggleSection]);

  const openAddKeyOnMount = searchParams.get("addKey") === "1";

  useEffect(() => {
    if (appliedAddKeyParam.current) return;
    if (!openAddKeyOnMount) return;
    appliedAddKeyParam.current = true;

    if (!expanded["ai-keys"]) {
      toggleSection("ai-keys");
    }

    router.replace("/dashboard/settings", { scroll: false });
  }, [expanded, openAddKeyOnMount, router, searchParams, toggleSection]);

  const engineHot = Boolean(initial.vaultKeyId);
  const aiSummaryKeys = aiEnabled
    ? engineHot
      ? "Your key active — unlimited AI tailoring"
      : "EasySubmit AI — add a key for unlimited tailoring"
    : "AI off · rules engine only";
  const generalSummary = `${autoApplyUserSwitch ? "One-click on" : "One-click off"} · ${profilePickerMode === "DEFAULT" ? "Default resume" : "Last used resume"}`;

  const connectedSet = new Set(initial.connectedProviders);

  const handleOpenAddKey = useCallback(() => {
    if (!expanded["ai-keys"]) {
      toggleSection("ai-keys");
    }
    setOpenAddKeyRequestId((id) => id + 1);
  }, [expanded, toggleSection]);

  const byokHeaderButton = useMemo(
    () => (engineHot ? null : <BYOKKeyHeaderAction onClick={handleOpenAddKey} />),
    [engineHot, handleOpenAddKey],
  );

  useRegisterDashboardHeaderActions(byokHeaderButton);

  useEffect(() => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (
      trimmedFirst === persistedProfileRef.current.firstName &&
      trimmedLast === persistedProfileRef.current.lastName
    ) {
      return;
    }

    if (!trimmedFirst) {
      return;
    }

    setSaved(false);
    const timer = window.setTimeout(() => {
      void (async () => {
        setSaving(true);
        setError(null);

        const result = await updateLoginProfile({ firstName, lastName });
        setSaving(false);

        if (!result.success) {
          setError(result.error);
          return;
        }

        persistedProfileRef.current = {
          firstName: result.firstName,
          lastName: (result.lastName ?? "").trim(),
        };

        await updateSession({
          firstName: result.firstName,
          lastName: result.lastName,
          name: result.name,
        });

        setSaved(true);
      })();
    }, PROFILE_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [firstName, lastName, updateSession]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  async function handleConnectProvider(provider: AuthProviderId) {
    setConnecting(provider);
    setError(null);
    await signIn(provider, { callbackUrl: "/dashboard/settings" });
  }

  async function handleAiToggle(enabled: boolean) {
    setAiPrefBusy(true);
    setError(null);
    const previous = aiEnabled;
    setAiEnabled(enabled);
    const result = await updateAiSourcePreference(enabled ? "auto" : "disabled");
    setAiPrefBusy(false);
    if (!result.success) {
      setAiEnabled(previous);
      setError(result.error);
    }
  }

  async function handleAutoApplyUserSwitchChange(enabled: boolean) {
    setAutoApplyUserSwitchBusy(true);
    setError(null);
    const result = await updateAutoApplyUserSwitch(enabled);
    setAutoApplyUserSwitchBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAutoApplyUserSwitch(result.autoApplyUserSwitch);
  }

  async function handleAutoArchiveChange(enabled: boolean) {
    setAutoArchiveBusy(true);
    setError(null);
    const result = await updateAutoArchiveAppliedJobs(enabled);
    setAutoArchiveBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAutoArchiveAppliedJobs(result.autoArchiveAppliedJobs);
  }

  async function handleProfilePickerModeChange(mode: ResumeProfilePickerMode) {
    setProfilePickerBusy(true);
    setError(null);
    const result = await updateResumeProfilePickerMode(mode);
    setProfilePickerBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setProfilePickerMode(result.resumeProfilePickerMode);
  }

  async function handleSystemAiToggle(enabled: boolean) {
    setSystemAiBusy(true);
    setError(null);
    const result = await updateSystemAiSetting(enabled);
    setSystemAiBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSystemAiEnabled(result.systemAiEnabled);
  }

  return (
    <>
      {open ? overlay : null}
      <DashboardWorkspacePage
        title="Settings"
        description="Account, sign-in, AI, and extension preferences."
        aside={
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : saving ? (
              <p className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Saving account…
              </p>
            ) : saved ? (
              <p className="rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-medium text-mint">
                Account saved.
              </p>
            ) : null}
            <DashboardExpandAllButton
              placement="page"
              expanded={allExpanded}
              onToggle={toggleAllSections}
            />
          </div>
        }
      >
        <DashboardWorkspaceStack>
          <StudioCollapsibleSection
            title={
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" aria-hidden="true" />
                Account
              </span>
            }
            description={`${initial.name || initial.email || "Account"} · ${initial.email ?? ""}`}
            expanded={Boolean(expanded.account)}
            onToggle={() => toggleSection("account")}
            variant="dashboard"
            showDragHandle={false}
            hasError={settingsSectionHasActionItems("account", actionItems)}
          >
            <div className="space-y-4">
              <AvatarUploadField
                image={avatarImage}
                firstName={firstName}
                lastName={lastName}
                email={initial.email}
                name={initial.name}
                seed={initial.email}
                onImageChange={setAvatarImage}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="account-first-name" className="text-xs font-medium">
                    First name
                  </label>
                  <Input
                    id="account-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    autoComplete="given-name"
                    className="h-9 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="account-last-name" className="text-xs font-medium">
                    Last name
                  </label>
                  <Input
                    id="account-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    autoComplete="family-name"
                    className="h-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {AUTH_PROVIDERS.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    connected={connectedSet.has(provider.id)}
                    isLastUsed={initial.lastAuthProvider === provider.id}
                    onConnect={handleConnectProvider}
                    connecting={connecting}
                  />
                ))}
              </div>
            </div>
          </StudioCollapsibleSection>

          <StudioCollapsibleSection
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                AI
              </span>
            }
            description={aiSummaryKeys}
            expanded={Boolean(expanded["ai-keys"])}
            onToggle={() => toggleSection("ai-keys")}
            variant="dashboard"
            showDragHandle={false}
            hasError={settingsSectionHasActionItems("ai-keys", actionItems)}
          >
            <div className="space-y-4">
              <SettingToggleRow
                label="AI enhancements"
                description={
                  aiEnabled
                    ? engineHot
                      ? initial.customerAiDailyUnlimited
                        ? "Your key active — unlimited AI tailoring"
                        : `Your key active — daily limit: ${initial.customerDailyEnhancementLimit} enhancements`
                      : initial.customerAiDailyUnlimited
                        ? "EasySubmit AI — add a provider key below for unlimited use"
                        : `EasySubmit AI — your key allows ${initial.customerDailyEnhancementLimit} enhancements/day`
                    : "Off — resume tailoring uses the rules engine only"
                }
                checked={aiEnabled}
                disabled={aiPrefBusy || !isClientAiGloballyEnabled()}
                onChange={(enabled) => void handleAiToggle(enabled)}
                icon={<Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
              />

              <AiSettingsPanel
                systemAiEnabled={systemAiEnabled}
                isSubscribed={initial.plan !== "free"}
                systemDailyLimit={initial.systemDailyEnhancementLimit}
                customerAiDailyUnlimited={initial.customerAiDailyUnlimited}
                customerDailyEnhancementLimit={initial.customerDailyEnhancementLimit}
                onToggleSystemAi={handleSystemAiToggle}
                isLoading={systemAiBusy}
              />

              <SettingsVaultKeysPanel
                initialKeys={initialVaultKeys}
                openAddOnMount={openAddKeyOnMount}
                openAddRequestId={openAddKeyRequestId}
              />

              {aiEnabled ? (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  AI uses work history only — contact info stays local.{" "}
                  <LegalDocumentLink documentId="terms" onOpen={openDocument}>
                    Terms
                  </LegalDocumentLink>
                  {" · "}
                  <LegalDocumentLink documentId="privacy" onOpen={openDocument}>
                    Privacy
                  </LegalDocumentLink>
                  {" · "}
                  <a
                    href="https://ai.google.dev/gemini-api/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Gemini terms
                  </a>
                </p>
              ) : null}
            </div>
          </StudioCollapsibleSection>

          <StudioCollapsibleSection
            title={
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                General
              </span>
            }
            description={generalSummary}
            expanded={Boolean(expanded["general"])}
            onToggle={() => toggleSection("general")}
            variant="dashboard"
            showDragHandle={false}
          >
            <div className="space-y-4">
              <SettingToggleRow
                label="One-click apply"
                description={
                  initial.autoApplyFeatureEnabled
                    ? "Workday capture, tailor, and fill — you submit."
                    : "Disabled platform-wide."
                }
                checked={autoApplyUserSwitch}
                disabled={autoApplyUserSwitchBusy || !initial.autoApplyFeatureEnabled}
                onChange={(enabled) => void handleAutoApplyUserSwitchChange(enabled)}
                icon={<Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
              />

              <SettingToggleRow
                label="Auto-archive applied jobs"
                description="When on, applied jobs move to Archive 24 hours after you mark them applied. When off, use Archive on each row."
                checked={autoArchiveAppliedJobs}
                disabled={autoArchiveBusy}
                onChange={(enabled) => void handleAutoArchiveChange(enabled)}
                icon={<Archive className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
              />

              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Extension resume
                </p>
                <SegmentedControl
                  name="Extension resume profile"
                  value={profilePickerMode}
                  options={PROFILE_PICKER_OPTIONS}
                  disabled={profilePickerBusy}
                  onChange={(value) => void handleProfilePickerModeChange(value)}
                />
              </div>
            </div>
          </StudioCollapsibleSection>
        </DashboardWorkspaceStack>
      </DashboardWorkspacePage>
    </>
  );
}
