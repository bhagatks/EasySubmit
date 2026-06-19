import "next-auth";

declare module "next-auth" {
  interface AuthOptions {
    allowDangerousEmailAccountLinking?: boolean;
  }

  interface Session {
    userId?: string;
    provider?: "linkedin";
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      onboardingStep: number;
    };
  }

  interface User {
    onboardingStep?: number;
    lastAuthProvider?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    onboardingStep?: number;
    lastAuthProvider?: string | null;
  }
}
