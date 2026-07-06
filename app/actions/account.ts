"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { extractLoginIdentity } from "@/lib/auth/extract-login-identity";
import { joinProfileName } from "@/lib/profile/name";
import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/src/lib/services/config-service";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import { reconcileUserVaultKeyState } from "@/lib/vault/reconcile-user-vault-key";
import type { ResumeProfilePickerMode } from "@/lib/generated/prisma/client";

const SUPPORTED_PROVIDERS = ["google", "linkedin"] as const;
export type AuthProviderId = (typeof SUPPORTED_PROVIDERS)[number];

export type AccountSettingsSnapshot = {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  lastAuthProvider: string | null;
  connectedProviders: AuthProviderId[];
  vaultKeyId: string | null;
  activeProvider: string | null;
  aiSourcePreference: string;
  systemAiEnabled: boolean;
  aiEnhancementsToday: number;
  aiCallsToday: number;
  autoApplyUserSwitch: boolean;
  autoArchiveAppliedJobs: boolean;
  autoApplyFeatureEnabled: boolean;
  resumeProfilePickerMode: ResumeProfilePickerMode;
  plan: string;
  /** Per-user daily system AI enhancement cap from `app_config.aiEngine`. */
  systemDailyEnhancementLimit: number;
  /** When false, BYOK uses `customerDailyEnhancementLimit` per day. */
  customerAiDailyUnlimited: boolean;
  customerDailyEnhancementLimit: number;
  /** Global `feature_flags.system_ai_enabled` — shared pool kill switch. */
  systemAiFeatureEnabled: boolean;
};

export type UpdateLoginProfileInput = {
  firstName: string;
  lastName: string;
};

export type UpdateLoginProfileResult =
  | {
      success: true;
      firstName: string;
      lastName: string;
      name: string;
    }
  | { success: false; error: string };

function normalizeProvider(value: string): AuthProviderId | null {
  return SUPPORTED_PROVIDERS.includes(value as AuthProviderId)
    ? (value as AuthProviderId)
    : null;
}

/** Login identity + connected OAuth providers for the Settings page. */
export async function getAccountSettings(): Promise<AccountSettingsSnapshot | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const reconciled = await reconcileUserVaultKeyState(session.user.id);

  const [user, featureFlags, aiEngine] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        image: true,
        lastAuthProvider: true,
        vaultKeyId: true,
        activeProvider: true,
        aiSourcePreference: true,
        systemAiEnabled: true,
        aiEnhancementsToday: true,
        aiCallsToday: true,
        aiQuotaResetAt: true,
        autoApplyUserSwitch: true,
        autoArchiveAppliedJobs: true,
        resumeProfilePickerMode: true,
        plan: true,
        accounts: {
          select: { provider: true },
        },
      },
    }),
    getFeatureFlags(),
    getAppConfig("aiEngine"),
  ]);

  if (!user) {
    return null;
  }

  const identity = extractLoginIdentity({
    name: user.name,
    given_name: user.firstName,
    family_name: user.lastName,
  });

  const connectedProviders = [
    ...new Set(
      user.accounts
        .map((account) => normalizeProvider(account.provider))
        .filter((provider): provider is AuthProviderId => provider !== null),
    ),
  ];

  return {
    firstName: identity.firstName || null,
    lastName: identity.lastName || null,
    name: identity.displayName || user.name,
    email: user.email,
    image: user.image,
    lastAuthProvider: user.lastAuthProvider,
    connectedProviders,
    vaultKeyId: reconciled.vaultKeyId ?? user.vaultKeyId,
    activeProvider: reconciled.activeProvider ?? user.activeProvider,
    aiSourcePreference: user.aiSourcePreference,
    systemAiEnabled: user.systemAiEnabled,
    aiEnhancementsToday: user.aiEnhancementsToday,
    aiCallsToday: user.aiCallsToday,
    autoApplyUserSwitch: user.autoApplyUserSwitch,
    autoArchiveAppliedJobs: user.autoArchiveAppliedJobs,
    autoApplyFeatureEnabled: featureFlags.extensionAutoApply,
    systemAiFeatureEnabled: featureFlags.systemAiEnabled,
    resumeProfilePickerMode: user.resumeProfilePickerMode,
    plan: user.plan,
    systemDailyEnhancementLimit: aiEngine.quotas.system.dailyUserEnhancements,
    customerAiDailyUnlimited: aiEngine.quotas.customer.aiDailyUnlimited,
    customerDailyEnhancementLimit: aiEngine.quotas.customer.dailyEnhancements,
  };
}

export async function updateResumeProfilePickerMode(
  mode: ResumeProfilePickerMode,
): Promise<
  { success: true; resumeProfilePickerMode: ResumeProfilePickerMode } | { success: false; error: string }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Sign in required." };
  }

  if (mode !== "DEFAULT" && mode !== "LAST_SELECTED") {
    return { success: false, error: "Invalid profile picker mode." };
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { resumeProfilePickerMode: mode },
    select: { resumeProfilePickerMode: true },
  });

  revalidatePath("/dashboard/settings");

  return { success: true, resumeProfilePickerMode: user.resumeProfilePickerMode };
}

export async function updateAutoApplyUserSwitch(
  enabled: boolean,
): Promise<{ success: true; autoApplyUserSwitch: boolean } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Sign in required." };
  }

  const flags = await getFeatureFlags();
  if (!flags.extensionAutoApply) {
    return {
      success: false,
      error: "One-click apply is disabled platform-wide.",
    };
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { autoApplyUserSwitch: enabled },
    select: { autoApplyUserSwitch: true },
  });

  revalidatePath("/dashboard/settings");

  return { success: true, autoApplyUserSwitch: user.autoApplyUserSwitch };
}

export async function updateAutoArchiveAppliedJobs(
  enabled: boolean,
): Promise<{ success: true; autoArchiveAppliedJobs: boolean } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Sign in required." };
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { autoArchiveAppliedJobs: enabled },
    select: { autoArchiveAppliedJobs: true },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/job-tracker");

  return { success: true, autoArchiveAppliedJobs: user.autoArchiveAppliedJobs };
}

/** Update login profile (`users` only — never touches resume `profiles`). */
export async function updateLoginProfile(
  input: UpdateLoginProfileInput,
): Promise<UpdateLoginProfileResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "Sign in to update your account." };
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!firstName) {
    return { success: false, error: "First name is required." };
  }

  const name = joinProfileName(firstName, lastName) || firstName;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName,
      lastName: lastName || null,
      name,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return { success: true, firstName, lastName, name };
}
