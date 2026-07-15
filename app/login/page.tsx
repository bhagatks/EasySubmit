"use client";

import { JetBrains_Mono } from "next/font/google";
import { signIn, signOut } from "next-auth/react";
import { clearClientSessionState } from "@/lib/auth/sign-out-client";
import { clearExtensionAuthFromBrowser } from "@/lib/extension/clear-extension-auth";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MarketTruth } from "@/components/MarketTruth";
import { TermsPrivacyConsent } from "@/components/legal/terms-privacy-consent";
import { InlineAlert } from "@/components/ui/inline-alert";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { LogoIcon } from "@/components/ui/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BRAND, brandCopyright } from "@/lib/brand";
import { resolveSafeCallbackUrl } from "@/lib/auth/safe-callback-url";
import {
  clearOAuthRedirectPending,
  clearLoginTermsAccepted,
  consumeOAuthRedirectPending,
  hasOAuthRedirectPending,
  markLoginTermsAccepted,
  markOAuthRedirectPending,
  readLoginTermsAccepted,
} from "@/lib/auth/oauth-login-client";
import { AnalyticsEvents, captureAnalyticsEvent } from "@/src/shared/analytics";
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

const OAUTH_HINT = "LinkedIn is preferred";

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

      <div className="relative flex h-full flex-col items-center justify-start px-6 pt-4 pb-8 sm:px-8 sm:pt-5 sm:pb-10 lg:px-10">
        <div className="mx-auto w-full max-w-sm shrink-0">{children}</div>
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

function OAuthContinueButton({
  label,
  loadingLabel,
  icon,
  disabled,
  isLoading,
  showHint,
  onClick,
}: {
  label: string;
  loadingLabel: string;
  icon: React.ReactNode;
  disabled: boolean;
  isLoading: boolean;
  showHint: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={SOCIAL_BUTTON_CLASS}
    >
      {icon}
      {isLoading ? loadingLabel : label}
    </button>
  );

  if (!showHint) {
    return button;
  }

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <span className="inline-flex w-full">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="border-0 bg-foreground text-background">
        {OAUTH_HINT}
      </TooltipContent>
    </Tooltip>
  );
}

function LoginPanel() {
  const searchParams = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const oauthInFlightRef = useRef(false);

  useEffect(() => {
    if (readLoginTermsAccepted()) {
      setTermsAccepted(true);
    }
    if (consumeOAuthRedirectPending()) {
      oauthInFlightRef.current = false;
      setLoadingProvider(null);
    }
  }, []);

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

  useEffect(() => {
    function resetOAuthLoading() {
      oauthInFlightRef.current = false;
      clearOAuthRedirectPending();
      if (readLoginTermsAccepted()) {
        flushSync(() => {
          setTermsAccepted(true);
        });
      }
      flushSync(() => {
        setLoadingProvider(null);
      });
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted || hasOAuthRedirectPending()) {
        resetOAuthLoading();
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        resetOAuthLoading();
      }
    }

    function onFocus() {
      resetOAuthLoading();
    }

    function onPopState() {
      resetOAuthLoading();
    }

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const isLoading = loadingProvider !== null;
  const oauthEnabled = termsAccepted && !isLoading;

  async function handleOAuth(provider: AuthProvider) {
    if (!termsAccepted || oauthInFlightRef.current) return;

    oauthInFlightRef.current = true;
    setLoadingProvider(provider);
    setError(null);

    captureAnalyticsEvent(AnalyticsEvents.LOGIN_STARTED, { provider });

    try {
      // Clear stale EasySubmit client drafts before OAuth and drop any surviving session cookie.
      // clearEasySubmitClientStorage() wipes every sessionStorage key prefixed "easysubmit" —
      // mark terms-accepted after this runs, or the flag it sets gets wiped immediately.
      await clearExtensionAuthFromBrowser();
      clearClientSessionState();
      await signOut({ redirect: false });
    } catch {
      // Already signed out — continue into provider OAuth.
    }

    markLoginTermsAccepted();

    const authParams: Record<string, string> =
      provider === "linkedin"
        ? {
            prompt: "login",
            max_age: "0",
            enable_extended_login: "true",
          }
        : { prompt: "select_account" };

    const callbackUrl = resolveSafeCallbackUrl(searchParams.get("callbackUrl"));

    try {
      const result = await signIn(provider, { callbackUrl, redirect: false }, authParams);

      if (result?.error) {
        oauthInFlightRef.current = false;
        clearOAuthRedirectPending();
        setLoadingProvider(null);
        setError("Authentication failed. Please try again.");
        return;
      }

      if (result?.url) {
        markOAuthRedirectPending(provider);
        flushSync(() => {
          setLoadingProvider(null);
        });
        window.location.assign(result.url);
        return;
      }

      oauthInFlightRef.current = false;
      clearOAuthRedirectPending();
      setLoadingProvider(null);
    } catch {
      oauthInFlightRef.current = false;
      clearOAuthRedirectPending();
      setLoadingProvider(null);
      setError("Authentication failed. Please try again.");
    }
  }

  return (
    <section className="relative flex min-h-screen w-full items-stretch justify-center bg-background p-4 sm:p-6 lg:min-h-0 lg:h-full lg:w-[450px] lg:max-w-[450px] lg:shrink-0 lg:border-l lg:border-white/[0.06] lg:p-8">
      <TooltipProvider>
        <LoginPanelChrome>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Login</h1>

            <LogoIcon className="mt-10 h-14 w-14 shrink-0 sm:mt-12 sm:h-16 sm:w-16" aria-hidden="true" />

            <BrandWordmark
              className="mt-6 text-xl sm:text-2xl"
              nameClassName="text-foreground"
            />
            <p className="mt-3 max-w-[16rem] text-sm leading-snug text-muted-foreground">
              {BRAND.tagline}
            </p>

            {error ? (
              <InlineAlert surface="glass" variant="error" className="mt-4 w-full text-left">
                {error}
              </InlineAlert>
            ) : null}

            <div className={cn("flex w-full flex-col gap-3 sm:gap-4", error ? "mt-6" : "mt-8")}>
              <OAuthContinueButton
                label="Continue with LinkedIn"
                loadingLabel="Redirecting…"
                icon={<LinkedInIcon />}
                disabled={!oauthEnabled}
                isLoading={loadingProvider === "linkedin"}
                showHint={oauthEnabled}
                onClick={() => void handleOAuth("linkedin")}
              />

              <OAuthContinueButton
                label="Continue with Google"
                loadingLabel="Redirecting…"
                icon={<GoogleIcon />}
                disabled={!oauthEnabled}
                isLoading={loadingProvider === "google"}
                showHint={oauthEnabled}
                onClick={() => void handleOAuth("google")}
              />

              <TermsPrivacyConsent
                checked={termsAccepted}
                onCheckedChange={(checked) => {
                  setTermsAccepted(checked);
                  if (checked) markLoginTermsAccepted();
                  else clearLoginTermsAccepted();
                }}
                disabled={isLoading}
                variant="glass"
                overlayPlacement="login-panel"
                className="mt-1"
              />

              <p className="mt-3 text-xs text-muted-foreground/65">
                {brandCopyright(new Date().getFullYear())}
              </p>
            </div>
          </div>
        </LoginPanelChrome>
      </TooltipProvider>
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
