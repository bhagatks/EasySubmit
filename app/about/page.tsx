import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, OAUTH_BRANDING_URLS } from "@/lib/brand";

const ABOUT_PURPOSE =
  `${BRAND.full} is a job application platform. Users tailor resumes to job postings, check ATS compatibility, track applications in a dashboard, and capture jobs with a Chrome extension.`;

const ABOUT_GOOGLE_DATA =
  `When you sign in with Google, ${BRAND.full} requests your email address, name, and profile photo to create your account and authenticate you. ${BRAND.full} does not read Gmail, Google Drive, Calendar, Contacts, or other Google user data.`;

export const metadata: Metadata = {
  title: BRAND.full,
  description: `${ABOUT_PURPOSE} ${ABOUT_GOOGLE_DATA}`,
  applicationName: BRAND.full,
  openGraph: {
    title: BRAND.full,
    description: ABOUT_PURPOSE,
    siteName: BRAND.full,
    url: OAUTH_BRANDING_URLS.about,
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
          {BRAND.full}
        </h1>
        <p className="mt-2 text-sm font-medium uppercase tracking-wide text-mint">
          Job application platform
        </p>

        <section className="mt-10 space-y-6 text-base leading-relaxed text-foreground/90">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              What is {BRAND.full}?
            </h2>
            <p className="mt-3">{ABOUT_PURPOSE}</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              What {BRAND.full} does
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Tailor resumes to each job description with AI assistance</li>
              <li>Export ATS-safe PDF and Word resumes</li>
              <li>Score keyword gaps, bullet quality, and parse integrity</li>
              <li>Track job applications from saved to applied</li>
              <li>Capture jobs and preview tailored resumes with a Chrome extension</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              How {BRAND.full} uses Google sign-in
            </h2>
            <p className="mt-3">{ABOUT_GOOGLE_DATA}</p>
          </div>
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          <a
            href={OAUTH_BRANDING_URLS.privacy}
            className="text-mint underline-offset-4 hover:underline"
          >
            Privacy Policy
          </a>
          {" · "}
          <a
            href={OAUTH_BRANDING_URLS.terms}
            className="text-mint underline-offset-4 hover:underline"
          >
            Terms of Service
          </a>
        </p>

        <p className="mt-6">
          <Link href="/" className="text-sm text-mint underline-offset-4 hover:underline">
            Back to {BRAND.full}
          </Link>
        </p>
      </main>
    </div>
  );
}
