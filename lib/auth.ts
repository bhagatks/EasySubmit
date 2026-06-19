import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { serverEnv } from "@/lib/env";
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

async function syncAuthProviderAndProfile(
  userId: string,
  email: string,
  provider: SupportedAuthProvider,
  fullName?: string | null,
) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastAuthProvider: provider },
  });

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      email,
      fullName: fullName ?? undefined,
    },
    update: {
      email,
      ...(fullName ? { fullName } : {}),
    },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  allowDangerousEmailAccountLinking: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    }),
    LinkedInProvider({
      clientId: serverEnv.LINKEDIN_CLIENT_ID,
      clientSecret: serverEnv.LINKEDIN_CLIENT_SECRET,
      wellKnown: "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      idToken: true,
      client: { protocol: "oidc" },
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      if (!isSupportedAuthProvider(account?.provider)) {
        return true;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      // New users: let the Prisma adapter create the record (events.signIn syncs after).
      if (!existingUser) {
        return true;
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastAuthProvider: account.provider },
      });

      await prisma.profile.upsert({
        where: { userId: existingUser.id },
        create: {
          userId: existingUser.id,
          email: user.email,
          fullName: user.name ?? undefined,
        },
        update: {
          email: user.email,
          ...(user.name ? { fullName: user.name } : {}),
        },
      });

      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.onboardingStep = user.onboardingStep ?? 0;
      }

      if (isSupportedAuthProvider(account?.provider)) {
        token.lastAuthProvider = account.provider;
      }

      if (trigger === "update" && session?.onboardingStep !== undefined) {
        token.onboardingStep = session.onboardingStep;
      }

      if (trigger === "update" && session?.userId !== undefined) {
        token.id = session.userId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.onboardingStep = (token.onboardingStep as number) ?? 0;
      }

      if (token.id) {
        session.userId = token.id as string;
      }

      if (token.lastAuthProvider === "linkedin") {
        session.provider = "linkedin";
      }

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
    async signIn({ user, account }) {
      if (!user.id || !user.email || !isSupportedAuthProvider(account?.provider)) {
        return;
      }

      await syncAuthProviderAndProfile(
        user.id,
        user.email,
        account.provider,
        user.name,
      );
    },
  },
  secret: serverEnv.NEXTAUTH_SECRET,
};
