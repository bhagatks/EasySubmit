import { cn } from "@/lib/utils";

export const ONBOARDING_HEADER_PRIMARY = "oklch(0.62 0.21 265)";

export const onboardingHeaderActionClass = cn(
  "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors hover:bg-white/[0.06]",
);

export const onboardingHeaderLinkClass = cn(
  onboardingHeaderActionClass,
  "underline-offset-2 hover:underline",
);

export const onboardingHeaderBackClass = cn(
  "inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors hover:border-[oklch(0.62_0.21_265_/_0.35)]",
);
