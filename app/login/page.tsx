"use client";

import { JetBrains_Mono } from "next/font/google";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MarketTruth } from "@/components/MarketTruth";
import { TermsPrivacyConsent } from "@/components/legal/terms-privacy-consent";
import { InlineAlert } from "@/components/ui/inline-alert";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { BRAND, brandCopyright } from "@/lib/brand";
import { resolveSafeCallbackUrl } from "@/lib/auth/safe-callback-url";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

const MONO = "var(--font-jetbrains), ui-monospace, monospace";

const SOCIAL_BUTTON_CLASS =
  "flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-[oklch(0.97_0.01_250)] transition-colors hover:border-[oklch(0.62_0.21_265_/_0.35)] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50 sm:py-4";

const LOGIN_FRAME_CLASS =
  "relative flex h-full min-h-[min(100dvh-2rem,720px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[oklch(0.32_0.04_268_/_0.55)] bg-surface/20 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.05)] lg:max-w-none lg:min-h-0";

function LoginPanelChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className={LOGIN_FRAME_CLASS}>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 45% at 50% 0%, oklch(0.62 0.21 265 / 0.12), transparent 58%), radial-gradient(ellipse 70% 40% at 50% 100%, oklch(0.82 0.16 165 / 0.08), transparent 62%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.32 0.04 268 / 0.35) 1px, transparent 1px), linear-gradient(90deg, oklch(0.32 0.04 268 / 0.22) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(180deg, black, transparent 88%)",
        }}
      />

      <div className="relative flex h-full flex-col px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="flex flex-1 flex-col items-center justify-end pb-8 text-center lg:pb-10">
          <BrandWordmark
            className="text-xl sm:text-2xl"
            nameClassName="text-foreground"
          />
          <p className="mt-3 max-w-[16rem] text-sm leading-snug text-muted-foreground">
            {BRAND.tagline}
          </p>
          <div
            className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            aria-hidden
          />
        </div>

        <div className="mx-auto w-full max-w-sm shrink-0">{children}</div>

        <div className="flex flex-1 flex-col items-center justify-start pt-8 text-center lg:pt-10" />
      </div>
    </div>
  );
}

type AuthProvider = "google" | "linkedin";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#0A66C2"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.063 2.063 0 01-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

function BrandingPanel() {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ backgroundColor: "oklch(0.16 0.04 268)" }}
    >
      <MarketTruth className="relative h-full min-h-0" loop />
    </div>
  );
}

function LoginPanel() {
  const searchParams = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError === "OAuthAccountNotLinked") {
      setError(
        "That email is already linked to another sign-in method. Use the same provider you signed up with, or try again — Google and LinkedIn with the same email should both work.",
      );
      return;
    }
    if (authError) {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  const isLoading = loadingProvider !== null;
  const signedOut = searchParams.get("signedOut") === "1";
  const hasStatusMessage = signedOut || Boolean(error);

  async function handleOAuth(provider: AuthProvider) {
    if (!termsAccepted) return;

    setLoadingProvider(provider);
    setError(null);

    try {
      // Clear any surviving EasySubmit session cookie before OAuth (httpOnly cookies
      // are not removed when users clear "application data" in the browser).
      await signOut({ redirect: false });
    } catch {
      // Already signed out — continue into provider OAuth.
    }

    const authParams: Record<string, string> =
      provider === "linkedin"
        ? {
            prompt: "login",
            max_age: "0",
            enable_extended_login: "true",
          }
        : { prompt: "select_account" };

    const callbackUrl = resolveSafeCallbackUrl(searchParams.get("callbackUrl"));

    void signIn(provider, { callbackUrl }, authParams);
  }

  return (
    <section className="relative flex min-h-screen w-full items-stretch justify-center bg-background p-4 sm:p-6 lg:min-h-0 lg:h-full lg:w-[450px] lg:max-w-[450px] lg:shrink-0 lg:border-l lg:border-white/[0.06] lg:p-8">
      <LoginPanelChrome>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Login</h1>

          {signedOut ? (
            <p className="mt-4 text-sm text-muted-foreground">
              You&apos;re signed out of EasySubmit. Choose a provider below to sign in
              again.
            </p>
          ) : null}

          {error ? (
            <InlineAlert surface="glass" variant="error" className="mt-4 text-left">
              {error}
            </InlineAlert>
          ) : null}

          <div
            className={cn(
              "flex w-full flex-col gap-3 sm:gap-4",
              error ? "mt-8" : hasStatusMessage ? "mt-6" : "mt-8 sm:mt-10",
            )}
          >
            <button
              type="button"
              disabled={isLoading || !termsAccepted}
              onClick={() => void handleOAuth("google")}
              className={SOCIAL_BUTTON_CLASS}
            >
              <GoogleIcon />
              {loadingProvider === "google" ? "Redirecting…" : "Continue with Google"}
            </button>

            <button
              type="button"
              disabled={isLoading || !termsAccepted}
              onClick={() => void handleOAuth("linkedin")}
              className={SOCIAL_BUTTON_CLASS}
            >
              <LinkedInIcon />
              {loadingProvider === "linkedin" ? "Redirecting…" : "Continue with LinkedIn"}
            </button>

            <TermsPrivacyConsent
              checked={termsAccepted}
              onCheckedChange={setTermsAccepted}
              disabled={isLoading}
              variant="glass"
              overlayPlacement="login-panel"
              className="mt-1"
            />

            <p className="mt-2 text-xs text-muted-foreground/65">
              {brandCopyright(new Date().getFullYear())}
            </p>
          </div>
        </div>
      </LoginPanelChrome>
    </section>
  );
}

function LoginFallback() {
  return (
    <main
      className={cn(
        jetbrainsMono.variable,
        "flex min-h-screen flex-col bg-background font-sans lg:grid lg:h-screen lg:grid-cols-[1fr_450px] lg:overflow-hidden",
      )}
    >
      <section className="relative hidden min-h-0 lg:block">
        <MarketTruth className="h-full min-h-0" loop play={false} />
      </section>
      <section className="relative flex min-h-screen w-full items-stretch justify-center bg-background p-4 sm:p-6 lg:min-h-0 lg:h-full lg:w-[450px] lg:shrink-0 lg:border-l lg:border-white/[0.06] lg:p-8">
        <LoginPanelChrome>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: MONO }}>
            Loading…
          </p>
        </LoginPanelChrome>
      </section>
    </main>
  );
}

function LoginPageContent() {
  return (
    <main
      className={cn(
        jetbrainsMono.variable,
        "flex min-h-screen flex-col bg-background font-sans lg:grid lg:h-screen lg:grid-cols-[1fr_450px] lg:overflow-hidden",
      )}
    >
      <section className="relative hidden min-h-0 lg:block">
        <BrandingPanel />
      </section>

      <LoginPanel />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
