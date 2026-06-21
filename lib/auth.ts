import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { serverEnv } from "@/lib/env";
import { extractLoginIdentity } from "@/lib/auth/extract-login-identity";
import { oauthClaimsFromSignIn } from "@/lib/auth/oauth-claims";
import { prisma } from "@/lib/prisma";

const SUPPORTED_AUTH_PROVIDERS = ["google", "linkedin"] as const;
type SupportedAuthProvider = (typeof SUPPORTED_AUTH_PROVIDERS)[number];

function isSupportedAuthProvider(
  provider: string | undefined,
): provider is SupportedAuthProvider {
  return (
    provider !== undefined &&
    SUPPORTED_AUTH_PROVIDERS.includes(provider as SupportedAuthProvider)
  );
}

function mapOAuthUser(profile: {
  sub: string;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  email?: string | null;
  picture?: string | null;
}) {
  const identity = extractLoginIdentity({
    name: profile.name,
    given_name: profile.given_name,
    family_name: profile.family_name,
  });

  return {
    id: profile.sub,
    name: identity.displayName || null,
    email: profile.email,
    image: profile.picture ?? null,
  };
}

type OAuthProfilePayload = {
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
};

async function syncLoginUser(
  userId: string,
  provider: SupportedAuthProvider,
  claims: OAuthProfilePayload,
) {
  const identity = extractLoginIdentity({
    name: claims.name,
    given_name: claims.given_name,
    family_name: claims.family_name,
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastAuthProvider: provider,
      firstName: identity.firstName || null,
      lastName: identity.lastName || null,
      name: identity.displayName || null,
      termsAcceptedAt: new Date(),
      ...(claims.picture ? { image: claims.picture } : {}),
    },
  });
}

async function applyLoginIdentityToToken(
  token: Record<string, unknown>,
  userId: string,
  fallbackName?: string | null,
) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      name: true,
      onboardingStep: true,
    },
  });

  const identity = extractLoginIdentity({
    name: dbUser?.name ?? fallbackName,
    given_name: dbUser?.firstName,
    family_name: dbUser?.lastName,
  });

  if (identity.firstName || identity.lastName || identity.displayName) {
    token.firstName = identity.firstName || null;
    token.lastName = identity.lastName || null;
    token.name = identity.displayName || dbUser?.name || null;
  }

  if (dbUser) {
    token.onboardingStep = dbUser.onboardingStep;
  } else {
    token.onboardingStep = 0;
  }
}

/** Seed default resume profile on first login only — never overwrite existing resume contact. */
async function seedDefaultResumeProfile(
  userId: string,
  email: string,
  claims: {
    name?: string | null;
    given_name?: string | null;
    family_name?: string | null;
  },
) {
  const existing = await prisma.profile.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const identity = extractLoginIdentity({
    name: claims.name,
    given_name: claims.given_name,
    family_name: claims.family_name,
  });

  await prisma.profile.create({
    data: {
      userId,
      email,
      isDefault: true,
      firstName: identity.firstName || undefined,
      lastName: identity.lastName || undefined,
    },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
      profile(profile) {
        return mapOAuthUser({
          sub: profile.sub,
          name: profile.name,
          given_name: profile.given_name,
          family_name: profile.family_name,
          email: profile.email,
          picture: profile.picture,
        });
      },
    }),
    LinkedInProvider({
      clientId: serverEnv.LINKEDIN_CLIENT_ID,
      clientSecret: serverEnv.LINKEDIN_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      wellKnown: "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      idToken: true,
      client: { protocol: "oidc" },
      authorization: {
        params: {
          scope: "openid profile email",
          prompt: "login",
          max_age: 0,
          enable_extended_login: "true",
        },
      },
      profile(profile) {
        return mapOAuthUser({
          sub: profile.sub,
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        });
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email);
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      if (user?.id) {
        token.id = user.id;
        token.onboardingStep = user.onboardingStep ?? 0;
      }

      if (isSupportedAuthProvider(account?.provider)) {
        token.lastAuthProvider = account.provider;
      }

      // Sync on sign-in here — events.signIn runs after JWT, too late for this redirect's session.
      if (
        user?.id &&
        user.email &&
        isSupportedAuthProvider(account?.provider)
      ) {
        const claims = oauthClaimsFromSignIn({
          profile,
          idToken: account?.id_token,
          userName: user.name,
          userImage: user.image,
        });

        await syncLoginUser(user.id, account.provider, claims);

        await seedDefaultResumeProfile(user.id, user.email, claims);

        const identity = extractLoginIdentity(claims);
        token.firstName = identity.firstName || null;
        token.lastName = identity.lastName || null;
        token.name = identity.displayName || null;
      }

      const userId = (user?.id ?? token.id) as string | undefined;
      const shouldHydrateIdentity =
        Boolean(userId) &&
        (Boolean(user?.id) ||
          token.firstName == null ||
          token.lastName == null ||
          token.lastName === "");

      if (userId && shouldHydrateIdentity) {
        await applyLoginIdentityToToken(token, userId, user?.name);
      }

      if (trigger === "update" && session?.onboardingStep !== undefined) {
        token.onboardingStep = session.onboardingStep;
      }

      if (trigger === "update" && session?.userId !== undefined) {
        token.id = session.userId;
      }

      if (trigger === "update" && session?.firstName !== undefined) {
        token.firstName = session.firstName;
      }

      if (trigger === "update" && session?.lastName !== undefined) {
        token.lastName = session.lastName;
      }

      if (trigger === "update" && session?.name !== undefined) {
        token.name = session.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.onboardingStep = (token.onboardingStep as number) ?? 0;
        session.user.firstName = (token.firstName as string | null | undefined) ?? null;
        session.user.lastName = (token.lastName as string | null | undefined) ?? null;
        session.user.name =
          (token.name as string | null | undefined) ?? session.user.name ?? null;
      }

      if (token.id) {
        session.userId = token.id as string;
      }

      if (token.lastAuthProvider === "linkedin") {
        session.provider = "linkedin";
      }

      session.lastAuthProvider =
        (token.lastAuthProvider as string | null | undefined) ?? null;

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return `${baseUrl}/onboarding`;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (!user.id || !user.email || !isSupportedAuthProvider(account?.provider)) {
        return;
      }

      const claims = oauthClaimsFromSignIn({
        profile,
        idToken: account?.id_token,
        userName: user.name,
        userImage: user.image,
      });

      // Idempotent backup — JWT callback performs the primary sync before redirect.
      await syncLoginUser(user.id, account.provider, claims);
      await seedDefaultResumeProfile(user.id, user.email, claims);
    },
  },
  secret: serverEnv.NEXTAUTH_SECRET,
};
