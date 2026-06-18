const SERVER_ENV_KEYS = [
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
] as const;

export type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

const isDevelopment = process.env.NODE_ENV === "development";

/** Keys that may use placeholders in development so the UI loads without real credentials. */
const DEV_OPTIONAL_KEYS = new Set<ServerEnvKey>([
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
]);

const DEV_PLACEHOLDERS: Record<ServerEnvKey, string> = {
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "dev-nextauth-secret-change-me-in-production",
  GOOGLE_CLIENT_ID: "dev-google-client-id",
  GOOGLE_CLIENT_SECRET: "dev-google-client-secret",
  LINKEDIN_CLIENT_ID: "dev-linkedin-client-id",
  LINKEDIN_CLIENT_SECRET: "dev-linkedin-client-secret",
};

function requireEnv(key: ServerEnvKey): string {
  const value = process.env[key];
  if (value) {
    return value;
  }

  if (isDevelopment && DEV_OPTIONAL_KEYS.has(key)) {
    console.warn(
      `[env] Missing ${key} — using development placeholder. OAuth sign-in will not work until this is set.`,
    );
    return DEV_PLACEHOLDERS[key];
  }

  throw new Error(`Missing required environment variable: ${key}`);
}

/** Validated server-side environment variables for NextAuth OAuth. */
export const serverEnv: Record<ServerEnvKey, string> = {
  get NEXTAUTH_URL() {
    return requireEnv("NEXTAUTH_URL");
  },
  get NEXTAUTH_SECRET() {
    return requireEnv("NEXTAUTH_SECRET");
  },
  get GOOGLE_CLIENT_ID() {
    return requireEnv("GOOGLE_CLIENT_ID");
  },
  get GOOGLE_CLIENT_SECRET() {
    return requireEnv("GOOGLE_CLIENT_SECRET");
  },
  get LINKEDIN_CLIENT_ID() {
    return requireEnv("LINKEDIN_CLIENT_ID");
  },
  get LINKEDIN_CLIENT_SECRET() {
    return requireEnv("LINKEDIN_CLIENT_SECRET");
  },
};
