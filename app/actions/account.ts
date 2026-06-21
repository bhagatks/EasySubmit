"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { extractLoginIdentity } from "@/lib/auth/extract-login-identity";
import { joinProfileName } from "@/lib/profile/name";
import { prisma } from "@/lib/prisma";

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
  aiEnhancementsToday: number;
  aiCallsToday: number;
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

  const user = await prisma.user.findUnique({
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
      aiEnhancementsToday: true,
      aiCallsToday: true,
      aiQuotaResetAt: true,
      accounts: {
        select: { provider: true },
      },
    },
  });

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
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    aiSourcePreference: user.aiSourcePreference,
    aiEnhancementsToday: user.aiEnhancementsToday,
    aiCallsToday: user.aiCallsToday,
  };
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
