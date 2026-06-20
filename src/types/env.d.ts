declare namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    LINKEDIN_CLIENT_ID: string;
    LINKEDIN_CLIENT_SECRET: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    DATABASE_URL: string;
  }
}

export {};
