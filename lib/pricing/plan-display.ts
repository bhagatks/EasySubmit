import type { SubscriptionConfig } from "@/src/lib/services/subscription-config";
import { BRAND } from "@/lib/brand";

export const FREE_PLAN_VISIBLE_FEATURES = [
  "Connect your own AI key",
  "Tailor every resume to the job",
  "ATS score, keywords, and bullet quality",
  "Chrome extension — capture jobs and preview on site",
  "Export PDF, Word, and LaTeX",
] as const;

export const FREE_PLAN_ALL_FEATURES = [
  "Connect your own AI key",
  "Tailor every resume to the job",
  "ATS score, keywords, and bullet quality",
  "Preview what ATS systems extract from your resume",
  "ATS-safe layout — built to pass scanners",
  "Track applications from saved to applied",
  "Review resume, cover letter, and fit per job",
  "Cover letters tailored to each role",
  "Chrome extension — capture jobs and preview on site",
  "Resume builder — import PDF or Word and edit",
  "Customize your resume for each application",
  "Profiles for different target roles",
  "Job-specific versions — your base profile stays intact",
  "Export PDF, Word, and LaTeX",
  "Control fonts, spacing, and resume length",
  "Improve structure and formatting without AI",
  "Extension and dashboard stay in sync",
  "Works on LinkedIn, Indeed, Workday, Greenhouse, and more",
] as const;

export const PAID_PLAN_VISIBLE_FEATURES = [
  `${BRAND.full} included — no API key needed`,
  "Tailor every resume to the job",
  "ATS score, keywords, and bullet quality",
  "Chrome extension — capture jobs and preview on site",
  "Export PDF, Word, and LaTeX",
] as const;

export const PAID_PLAN_ALL_FEATURES = [
  `${BRAND.full} included — no API key needed`,
  "Tailor every resume to the job",
  "ATS score, keywords, and bullet quality",
  "Preview what ATS systems extract from your resume",
  "ATS-safe layout — built to pass scanners",
  "Track applications from saved to applied",
  "Review resume, cover letter, and fit per job",
  "Cover letters tailored to each role",
  "Chrome extension — capture jobs and preview on site",
  "Resume builder — import PDF or Word and edit",
  "Customize your resume for each application",
  "Profiles for different target roles",
  "Job-specific versions — your base profile stays intact",
  "Export PDF, Word, and LaTeX",
  "Control fonts, spacing, and resume length",
  "Improve structure and formatting without AI",
  "Extension and dashboard stay in sync",
  "Works on LinkedIn, Indeed, Workday, Greenhouse, and more",
  "ATS tips for Workday, Greenhouse, Lever, and more",
] as const;

/** Shared marketing copy — keep `/`, `/pricing`, and `/select-plan` in sync. */
export const PRICING_PAGE_COPY = {
  metaDescription:
    `Free with your own AI key. Paid plans with ${BRAND.full} — coming soon.`,
  eyebrow: "Simple pricing",
  title: "Free with your key.",
  titleAccent: "Pay for ours.",
  subhead:
    `Free plan uses your own API key with a daily resume limit. Paid plans with ${BRAND.full} are coming soon.`,
  footerDailyLimit: "Daily limits reset at midnight UTC on the free plan.",
  footerPaidComingSoon: `Paid subscriptions with ${BRAND.full} — coming soon.`,
} as const;

export const PRICING_FAQ = [
  {
    q: "What counts as an AI enhance?",
    a: "Each time you run AI to tailor your resume to a job description counts as one enhancement. Scoring, keyword gap analysis, and ATS checks do not count.",
  },
  {
    q: "What is BYOK?",
    a: "Bring Your Own Key — connect your own OpenAI, Anthropic, Gemini, or Groq API key. Your key pays the AI provider directly (cents per resume).",
  },
  {
    q: "Do daily limits reset?",
    a: "Yes. Free plan limits reset at midnight UTC every day.",
  },
] as const;

export type PricingDisplayPlan = {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  comingSoon?: boolean;
  description: string;
  savingsNote?: string;
  tiers: { label: string; detail: string }[];
  visibleFeatures: string[];
  allFeatures: string[];
  cta: string;
  ctaHref: string;
};

export function formatSubscriptionPrice(price: number): string {
  return `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
}

function paidPlanFeatures() {
  return {
    visibleFeatures: [...PAID_PLAN_VISIBLE_FEATURES],
    allFeatures: [...PAID_PLAN_ALL_FEATURES],
  };
}

export function buildPricingDisplayPlans(sub: SubscriptionConfig): PricingDisplayPlan[] {
  const live = sub.enabled;
  const { weekly, monthly, yearly } = sub.plans;

  const monthlySavings = Math.round((weekly.price * 4 - monthly.price) * 100) / 100;
  const yearlySavings = Math.round((monthly.price * 12 - yearly.price) * 100) / 100;
  const yearlyMonthlyEquiv = yearly.price / 12;

  const paidTier = {
    label: BRAND.full,
    detail: "No API key required",
  };

  const paidFeatures = paidPlanFeatures();

  return [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Start with your own AI key — no card required.",
      tiers: [{ label: "Your key", detail: "Daily limit applies" }],
      visibleFeatures: [...FREE_PLAN_VISIBLE_FEATURES],
      allFeatures: [...FREE_PLAN_ALL_FEATURES],
      cta: "Start for Free",
      ctaHref: "/login",
    },
    {
      id: "weekly",
      name: "Weekly",
      price: formatSubscriptionPrice(weekly.price),
      period: "/ week",
      description: `${BRAND.full} for active job seekers.`,
      comingSoon: !live,
      tiers: [paidTier],
      ...paidFeatures,
      cta: live ? "Subscribe" : "Coming Soon",
      ctaHref: live ? "/dashboard/billing" : "#",
    },
    {
      id: "monthly",
      name: "Monthly",
      price: formatSubscriptionPrice(monthly.price),
      period: "/ month",
      badge: "Most Popular",
      description: "Best value for a full job search cycle.",
      savingsNote: `Saves ~$${monthlySavings} vs weekly`,
      comingSoon: !live,
      tiers: [paidTier],
      ...paidFeatures,
      cta: live ? "Subscribe" : "Coming Soon",
      ctaHref: live ? "/dashboard/billing" : "#",
    },
    {
      id: "yearly",
      name: "Yearly",
      price: formatSubscriptionPrice(yearly.price),
      period: "/ year",
      badge: "Best Value",
      description: "Committed to landing your next role.",
      savingsNote: `~$${yearlyMonthlyEquiv.toFixed(2)}/mo — saves $${yearlySavings} vs monthly`,
      comingSoon: !live,
      tiers: [paidTier],
      ...paidFeatures,
      cta: live ? "Subscribe" : "Coming Soon",
      ctaHref: live ? "/dashboard/billing" : "#",
    },
  ];
}
