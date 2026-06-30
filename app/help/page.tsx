import type { Metadata } from "next";
import { HelpCategoryGrid } from "@/components/help/help-category-grid";
import { HelpSearch } from "@/components/help/help-search";
import { HelpShell } from "@/components/help/help-shell";
import { BRAND } from "@/lib/brand";
import { HELP_CATEGORIES } from "@/lib/help";

export const metadata: Metadata = {
  title: `Help Center | ${BRAND.full}`,
  description: `FAQs and guides for ${BRAND.full} — extension, resume tailoring, job tracker, and account settings.`,
};

export default function HelpHomePage() {
  return (
    <HelpShell backHref="/" backLabel="Home">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          How can we help you?
        </h1>
        <p className="mt-3 text-muted-foreground">
          Search our guides or browse topics below.
        </p>
        <div className="mt-8">
          <HelpSearch />
        </div>
      </div>

      <section className="mt-14">
        <HelpCategoryGrid categories={HELP_CATEGORIES} />
      </section>
    </HelpShell>
  );
}
