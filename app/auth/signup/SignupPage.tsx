"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildOnboardingPayload,
  isOnboardingComplete,
} from "@/lib/onboarding/payload";
import { createClient } from "@/lib/supabase/client";
import { LogoIcon } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand";
import { useOnboardingStore } from "@/src/stores/onboarding-store";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onboardingState = useOnboardingStore();

  const saveProfile = useCallback(
    async (resumeFile: File | null) => {
      const payload = buildOnboardingPayload({
        jobTimeline: onboardingState.jobTimeline,
        targetLocations: onboardingState.targetLocations,
        experienceLevels: onboardingState.experienceLevels,
        selectedRole: onboardingState.selectedRole,
        minSalary: onboardingState.minSalary,
        referralSource: onboardingState.referralSource,
        resumeFile,
        resumeFileName: onboardingState.resumeFileName,
      });

      if (!isOnboardingComplete(payload)) {
        throw new Error("Please complete onboarding before signing up.");
      }

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const response = await fetch("/api/profile/finalize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save profile");
      }
    },
    [onboardingState],
  );

  const completeSignupAfterAuth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await saveProfile(onboardingState.resumeFile);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [onboardingState.resumeFile, router, saveProfile]);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setError("Authentication failed. Please try again.");
    }
    if (searchParams.get("oauth") === "1") {
      void completeSignupAfterAuth();
    }
  }, [searchParams, completeSignupAfterAuth]);

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user && !data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        return;
      }

      await saveProfile(onboardingState.resumeFile);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/signup?oauth=1`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <LogoIcon className="h-10 w-10" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {BRAND.full}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Save your profile and start applying to matched jobs.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-elevated">
          {error && (
            <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="mb-4 rounded-lg border border-mint/40 bg-mint/10 px-3 py-2 text-sm text-mint">
              {message}
            </p>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
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
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/onboarding" className="text-primary hover:underline">
            Back to onboarding
          </Link>
        </p>
      </div>
    </main>
  );
}
