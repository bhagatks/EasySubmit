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
import { useOnboardingStore } from "@/stores/onboardingStore";

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
    [onboardingState]
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-simplifyBg px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <LogoIcon className="h-10 w-10" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-simplifyBlue">
            EasySubmit.ai
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-simplifyDark">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Save your profile and start applying to matched jobs.
          </p>
        </div>

        <div className="rounded bg-white p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {message && (
            <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </p>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-simplifyDark"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-gray-200 px-4 py-3 text-sm focus:border-simplifyBlue focus:outline-none focus:ring-1 focus:ring-simplifyBlue"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-simplifyDark"
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
                className="w-full rounded border border-gray-200 px-4 py-3 text-sm focus:border-simplifyBlue focus:outline-none focus:ring-1 focus:ring-simplifyBlue"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-simplifyBlue py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white py-3 text-sm font-medium text-simplifyDark transition-colors hover:bg-gray-50 disabled:opacity-50"
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

        <p className="mt-6 text-center text-xs text-gray-500">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/onboarding" className="text-simplifyBlue hover:underline">
            Back to onboarding
          </Link>
        </p>
      </div>
    </main>
  );
}
