"use client";

import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";

type AuthProvider = "google" | "linkedin";

const oauthButtonClass =
  "w-full border border-primary/20 bg-white/[0.04] text-foreground shadow-sm transition-all duration-300 hover:border-primary/50 hover:bg-primary/[0.08] hover:shadow-[0_0_24px_-6px_oklch(0.62_0.21_265_/_0.45)]";

const authButtonsVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const authButtonItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const meshOrbTransition = {
  duration: 22,
  repeat: Infinity,
  repeatType: "mirror" as const,
  ease: "easeInOut",
};

function AmbientMeshPanel() {
  return (
    <div
      aria-hidden="true"
      className="relative h-full w-full overflow-hidden bg-[oklch(0.16_0.04_268)]"
    >
      <motion.div
        className="pointer-events-none absolute -left-[15%] -top-[20%] h-[70%] w-[70%] rounded-full opacity-70 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.62 0.21 265 / 0.28) 0%, oklch(0.16 0.04 268 / 0) 68%)",
        }}
        animate={{
          x: [0, 48, -24, 0],
          y: [0, 32, -16, 0],
          scale: [1, 1.12, 0.96, 1],
        }}
        transition={meshOrbTransition}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-[25%] left-[20%] h-[65%] w-[65%] rounded-full opacity-60 blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.82 0.16 165 / 0.14) 0%, oklch(0.16 0.04 268 / 0) 70%)",
        }}
        animate={{
          x: [0, -40, 28, 0],
          y: [0, -36, 20, 0],
          scale: [1, 0.92, 1.08, 1],
        }}
        transition={{ ...meshOrbTransition, duration: 26 }}
      />
      <motion.div
        className="pointer-events-none absolute right-[-10%] top-[30%] h-[55%] w-[55%] rounded-full opacity-50 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.35 0.12 265 / 0.35) 0%, oklch(0.16 0.04 268 / 0) 72%)",
        }}
        animate={{
          x: [0, -32, 24, 0],
          y: [0, 28, -20, 0],
          scale: [1, 1.06, 0.94, 1],
        }}
        transition={{ ...meshOrbTransition, duration: 30 }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 100%, oklch(0.21 0.05 268 / 0.9) 0%, oklch(0.16 0.04 268 / 0) 65%)",
        }}
        animate={{ opacity: [0.35, 0.5, 0.38] }}
        transition={{ duration: 14, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />

      <div className="bg-grid absolute inset-0 opacity-[0.18]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
        >
          <LogoIcon className="h-8 w-8 shrink-0 opacity-90" aria-hidden="true" />
          <span className="font-display tracking-tight">EasySubmit.ai</span>
        </Link>

        <div className="max-w-lg">
          <p className="font-display text-sm font-medium uppercase tracking-[0.2em] text-primary/70">
            Career automation
          </p>
          <p className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white/90 xl:text-5xl">
            Precision at scale.
          </p>
          <p className="mt-4 max-w-md font-body text-base leading-relaxed text-white/45">
            Deploy tailored applications across thousands of portals with verified, ATS-ready
            identity sync.
          </p>
        </div>

        <p className="font-body text-xs tracking-wide text-white/30">
          Trusted by professionals navigating modern hiring pipelines.
        </p>
      </div>
    </div>
  );
}

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

function LoginForm() {
  const searchParams = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  function handleSignIn(provider: AuthProvider) {
    setLoadingProvider(provider);
    setError(null);
    void signIn(provider, { callbackUrl: "/onboarding/step-1" });
  }

  const isLoading = loadingProvider !== null;

  return (
    <main className="flex min-h-screen font-dm lg:h-screen lg:overflow-hidden">
      <section className="relative hidden min-h-[280px] lg:block lg:h-full lg:w-[60%]">
        <AmbientMeshPanel />
      </section>

      <section className="relative flex w-full flex-1 flex-col bg-background lg:w-[40%]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,oklch(0.62_0.21_265_/_0.06),transparent_70%)] lg:hidden"
        />
        <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-[0.12] lg:hidden" />

        <div className="relative flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto w-full max-w-[420px]"
          >
            <div className="overflow-hidden rounded-xl border border-white/10 bg-surface/60 shadow-elevated backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-6 py-4">
                <div className="flex items-center gap-3">
                  <LogoIcon className="h-9 w-9 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-display text-sm font-semibold tracking-tight text-foreground">
                      Access Console
                    </p>
                    <p className="font-body text-xs text-white/45">Secure authentication</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-wider text-primary">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Live
                </span>
              </div>

              <div className="p-6 sm:p-8">
                <div className="lg:hidden">
                  <Link
                    href="/"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    ← Back to home
                  </Link>
                </div>

                <h1 className="font-display text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
                  Apply with precision. One-click automation for the modern career.
                </h1>
                <p className="mt-3 font-body text-base leading-relaxed text-white/60">
                  Synchronize your professional identity to deploy tailored applications at scale.
                </p>

                {error && (
                  <p
                    role="alert"
                    className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
                  >
                    {error}
                  </p>
                )}

                <div className="mt-8">
                  <p className="mb-3 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Identity provider
                  </p>

                  <motion.div
                    className="flex flex-col gap-3"
                    variants={authButtonsVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div variants={authButtonItemVariants}>
                      <Button
                        type="button"
                        variant="outline"
                        size="xl"
                        disabled={isLoading}
                        onClick={() => handleSignIn("linkedin")}
                        className={oauthButtonClass}
                      >
                        <LinkedInIcon />
                        {loadingProvider === "linkedin" ? "Redirecting…" : "Continue with LinkedIn"}
                      </Button>
                    </motion.div>

                    <motion.div variants={authButtonItemVariants}>
                      <Button
                        type="button"
                        variant="outline"
                        size="xl"
                        disabled={isLoading}
                        onClick={() => handleSignIn("google")}
                        className={oauthButtonClass}
                      >
                        <GoogleIcon />
                        {loadingProvider === "google" ? "Redirecting…" : "Continue with Google"}
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>

                <p className="mt-6 border-t border-white/10 pt-5 font-body text-xs leading-relaxed text-muted-foreground/80">
                  By continuing, you agree to our terms of service and privacy policy.
                </p>
              </div>
            </div>

            <p className="mt-8 hidden text-center lg:block">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                ← Back to home
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen font-dm lg:h-screen">
      <section className="hidden lg:block lg:h-full lg:w-[60%] bg-[oklch(0.16_0.04_268)]" />
      <section className="flex flex-1 items-center justify-center bg-background lg:w-[40%]">
        <div className="flex flex-col items-center gap-3">
          <LogoIcon className="h-12 w-12 animate-pulse opacity-60" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
