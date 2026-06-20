"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { Check, Key, Link2, Snowflake, Sparkles } from "lucide-react";
import {
  type AccountSettingsSnapshot,
  type AuthProviderId,
  updateLoginProfile,
} from "@/app/actions/account";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

function accountInitials(firstName: string | null, lastName: string | null, email: string | null) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  const fromEmail = email?.trim()?.[0] ?? "?";
  return (first + last).toUpperCase() || fromEmail.toUpperCase();
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
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
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{provider.label}</p>
        <p className="text-xs text-muted-foreground">
          {connected ? "Connected" : "Not connected"}
          {connected && isLastUsed ? " · Last sign-in" : ""}
        </p>
      </div>
      {connected ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-mint">
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
          className="rounded-xl"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          {connecting === provider.id ? "Connecting…" : "Connect"}
        </Button>
      )}
    </div>
  );
}

export function AccountSettings({ initial }: AccountSettingsProps) {
  const { update: updateSession } = useSession();
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<AuthProviderId | null>(null);

  const engineHot = Boolean(initial.vaultKeyId);
  const initials = accountInitials(initial.firstName, initial.lastName, initial.email);
  const connectedSet = new Set(initial.connectedProviders);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your account, sign-in methods, and workspace preferences.
        </p>
      </div>

      <SettingsSection
        title="Account"
        description="Your login identity. Resume contact details live under Resume profiles."
      >
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 text-base font-semibold text-primary">
            {initial.image ? (
              <Image
                src={initial.image}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {initial.name || initial.email || "Account"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Photo from your sign-in provider
            </p>
          </div>
        </div>

        <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="account-first-name" className="text-sm font-medium">
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
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="account-last-name" className="text-sm font-medium">
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
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="account-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="account-email"
              value={initial.email ?? ""}
              readOnly
              disabled
              className="rounded-xl opacity-80"
            />
            <p className="text-xs text-muted-foreground">
              Managed by your OAuth provider. To change it, update your Google or LinkedIn account.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {saved ? (
            <p className="text-sm text-mint">Account updated.</p>
          ) : null}

          <Button type="submit" disabled={saving} className="rounded-xl">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Sign-in methods"
        description="Connect providers that share the same email to sign in either way."
      >
        <div className="space-y-3">
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
      </SettingsSection>

      <SettingsSection
        title="Plan & engine"
        description="Billing and credits are coming soon. BYOK keys are managed separately."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                engineHot ? "bg-mint/15 text-mint" : "bg-muted text-muted-foreground",
              )}
            >
              {engineHot ? (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Snowflake className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {engineHot ? "Engine active" : "Engine cold"}
              </p>
              <p className="text-xs text-muted-foreground">
                {engineHot
                  ? `BYOK connected${initial.activeProvider ? ` · ${initial.activeProvider}` : ""}`
                  : "Add an AI key to unlock the headless engine."}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/dashboard/keys">
              <Key className="h-4 w-4" aria-hidden="true" />
              Manage AI keys
            </Link>
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Session">
        <p className="mb-4 text-sm text-muted-foreground">
          Signing out clears this browser&apos;s session, BYOK unlock state, and onboarding
          drafts. Your resumes and applications stay saved in your account.
        </p>
        <SignOutButton variant="ghost" label="Sign out" className="rounded-xl" />
      </SettingsSection>
    </div>
  );
}
