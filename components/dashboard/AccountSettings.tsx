"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FileText,
  Key,
  Link2,
  Loader2,
  Save,
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
import type { ResumeProfilePickerMode } from "@/lib/generated/prisma/client";
import { updateAiSourcePreference } from "@/app/actions/ai/enhance-resume";
import {
  LegalDocumentLink,
  useLegalDocumentOverlay,
} from "@/components/legal/legal-document-overlay";
import { AvatarUploadField } from "@/components/profile/avatar-upload-field";
import {
  useDashboardExpandAllControl,
  useRegisterDashboardHeaderActions,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import {
  DashboardWorkspacePage,
  DashboardWorkspaceStack,
} from "@/components/dashboard/DashboardWorkspacePage";
import { StudioCollapsibleSection } from "@/components/resume/StudioCollapsibleSection";
import { StudioIconButton } from "@/components/resume/StudioIconButton";
import {
  SYSTEM_AI_DAILY_CALL_LIMIT,
  SYSTEM_AI_DAILY_ENHANCEMENT_LIMIT,
} from "@/src/lib/ai/engine/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const SETTINGS_ACCOUNT_FORM_ID = "settings-account-form";

const SETTINGS_SECTION_IDS = ["account", "ai-keys", "general"];

type AccountSettingsProps = {
  initial: AccountSettingsSnapshot;
};

type ProviderMeta = {
  id: AuthProviderId;
  label: string;
};

const AUTH_PROVIDERS: ProviderMeta[] = [
  { id: "google", label: "Google" },
  { id: "linkedin", label: "LinkedIn" },
];

const AI_SOURCE_OPTIONS = [
  { value: "auto" as const, label: "Auto", hint: "Your key if set, else EasySubmit AI" },
  { value: "customer" as const, label: "My key", hint: "BYOK only" },
  { value: "system" as const, label: "EasySubmit AI", hint: "Daily limits apply" },
];

const PROFILE_PICKER_OPTIONS = [
  { value: "DEFAULT" as const, label: "Default", hint: "Your default profile" },
  { value: "LAST_SELECTED" as const, label: "Last used", hint: "From extension card" },
];

const AI_SOURCE_LABELS: Record<(typeof AI_SOURCE_OPTIONS)[number]["value"], string> = {
  auto: "Auto",
  customer: "My key",
  system: "EasySubmit AI",
};

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

function SettingToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/30 px-3 py-2.5",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
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

export function AccountSettings({ initial }: AccountSettingsProps) {
  const { update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedAiSourceParam = useRef(false);
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<AuthProviderId | null>(null);
  const [aiSource, setAiSource] = useState(initial.aiSourcePreference || "auto");
  const [aiPrefBusy, setAiPrefBusy] = useState(false);
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

  const { expanded, toggleSection } = useDashboardExpandAllControl([...SETTINGS_SECTION_IDS]);

  useEffect(() => {
    if (appliedAiSourceParam.current) return;
    if (searchParams.get("aiSource") !== "auto") return;
    appliedAiSourceParam.current = true;

    if (!expanded["ai-keys"]) {
      toggleSection("ai-keys");
    }

    void (async () => {
      if (initial.aiSourcePreference !== "auto") {
        setAiPrefBusy(true);
        setError(null);
        const result = await updateAiSourcePreference("auto");
        setAiPrefBusy(false);
        if (!result.success) {
          setError(result.error);
        } else {
          setAiSource("auto");
        }
      }
      router.replace("/dashboard/settings", { scroll: false });
    })();
  }, [expanded, initial.aiSourcePreference, router, searchParams, toggleSection]);

  const aiSummaryKeys = `${AI_SOURCE_LABELS[aiSource as keyof typeof AI_SOURCE_LABELS] ?? "Auto"} · ${initial.aiEnhancementsToday}/${SYSTEM_AI_DAILY_ENHANCEMENT_LIMIT} enhancements`;
  const generalSummary = `${autoApplyUserSwitch ? "One-click on" : "One-click off"} · ${profilePickerMode === "DEFAULT" ? "Default resume" : "Last used resume"}`;

  const engineHot = Boolean(initial.vaultKeyId);
  const connectedSet = new Set(initial.connectedProviders);

  const saveButton = useMemo(
    () => (
      <StudioIconButton
        type="submit"
        form={SETTINGS_ACCOUNT_FORM_ID}
        tone="bordered"
        disabled={saving}
        aria-label={saving ? "Saving profile" : "Save account"}
        title={saving ? "Saving…" : "Save account"}
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </StudioIconButton>
    ),
    [saving],
  );

  useRegisterDashboardHeaderActions(saveButton);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const result = await updateLoginProfile({ firstName, lastName });
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    await updateSession({
      firstName: result.firstName,
      lastName: result.lastName,
      name: result.name,
    });

    setSaved(true);
  }

  async function handleConnectProvider(provider: AuthProviderId) {
    setConnecting(provider);
    setError(null);
    await signIn(provider, { callbackUrl: "/dashboard/settings" });
  }

  async function handleAiSourceChange(value: "auto" | "customer" | "system") {
    setAiPrefBusy(true);
    setError(null);
    const result = await updateAiSourcePreference(value);
    setAiPrefBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAiSource(value);
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


  return (
    <>
      {open ? overlay : null}
      <DashboardWorkspacePage
        title="Settings"
        description="Account, sign-in, AI, and extension preferences."
        aside={
          error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : saved ? (
            <p className="rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-medium text-mint">
              Account saved.
            </p>
          ) : null
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

              <form
                id={SETTINGS_ACCOUNT_FORM_ID}
                onSubmit={(event) => void handleSave(event)}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="space-y-1">
                  <label htmlFor="account-first-name" className="text-xs font-medium">
                    First name
                  </label>
                  <Input
                    id="account-first-name"
                    value={firstName}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                      setSaved(false);
                    }}
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
                    onChange={(event) => {
                      setLastName(event.target.value);
                      setSaved(false);
                    }}
                    autoComplete="family-name"
                    className="h-9 rounded-xl"
                  />
                </div>
              </form>

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
                AI Keys
              </span>
            }
            description={aiSummaryKeys}
            expanded={Boolean(expanded["ai-keys"])}
            onToggle={() => toggleSection("ai-keys")}
            variant="dashboard"
            showDragHandle={false}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">AI source</p>
                <SegmentedControl
                  name="AI source"
                  value={aiSource}
                  options={AI_SOURCE_OPTIONS}
                  disabled={aiPrefBusy}
                  onChange={(value) =>
                    void handleAiSourceChange(value as "auto" | "customer" | "system")
                  }
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-2.5">
                <div className="min-w-0 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Today&apos;s usage</span>
                  <span className="mt-0.5 block">
                    {initial.aiEnhancementsToday}/{SYSTEM_AI_DAILY_ENHANCEMENT_LIMIT} enhancements ·{" "}
                    {initial.aiCallsToday}/{SYSTEM_AI_DAILY_CALL_LIMIT} calls
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="h-8 shrink-0 rounded-xl">
                  <Link href="/dashboard/keys">
                    <Key className="h-3.5 w-3.5" aria-hidden="true" />
                    {engineHot ? "Manage keys" : "Add key"}
                  </Link>
                </Button>
              </div>

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
