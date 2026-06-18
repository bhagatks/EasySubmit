import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { serverEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  providers: [
    GoogleProvider({
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    }),
    LinkedInProvider({
      clientId: serverEnv.LINKEDIN_CLIENT_ID,
      clientSecret: serverEnv.LINKEDIN_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.onboardingStep = user.onboardingStep ?? 1;
      }

      if (user.lastAuthProvider === "linkedin") {
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

      return `${baseUrl}/onboarding/step-1`;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (user.id && account?.provider) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastAuthProvider: account.provider },
        });
      }
    },
  },
  secret: serverEnv.NEXTAUTH_SECRET,
};
