"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractLoginIdentity } from "@/lib/auth/extract-login-identity";
import { prisma } from "@/lib/prisma";

export type ProfileIdentity = {
  firstName: string | null;
  lastName: string | null;
  email: string;
};

export type LoginIdentitySnapshot = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
};

export async function getLoginIdentity(): Promise<LoginIdentitySnapshot | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      name: true,
      image: true,
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

  return {
    firstName: identity.firstName || null,
    lastName: identity.lastName || null,
    email: user.email,
    name: identity.displayName || user.name,
    image: user.image,
  };
}

export async function getProfileIdentity(): Promise<ProfileIdentity | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const profile = await prisma.profile.findFirst({
    where: { userId: session.user.id, isDefault: true },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return profile;
}
