import "next-auth";

declare module "next-auth" {
  interface AuthOptions {
    allowDangerousEmailAccountLinking?: boolean;
  }

  interface Session {
    userId?: string;
    provider?: "linkedin";
    lastAuthProvider?: string | null;
    user: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      name?: string | null;
      image?: string | null;
      onboardingStep: number;
    };
  }

  interface User {
    onboardingStep?: number;
    lastAuthProvider?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    onboardingStep?: number;
    lastAuthProvider?: string | null;
  }
}
