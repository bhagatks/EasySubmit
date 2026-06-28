import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { PricingPlansSection } from "@/components/pricing/PricingPlansSection";
import { brandCopyright, BRAND } from "@/lib/brand";
import { getExtensionForceUpgradeConfig } from "@/lib/extension/force-upgrade-gate";
import { LogoIcon } from "@/components/ui/logo";
import { PRICING_PAGE_COPY } from "@/lib/pricing/plan-display";

export const metadata = {
  title: `Pricing — ${BRAND.full}`,
  description: PRICING_PAGE_COPY.metaDescription,
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const forceUpgrade = await getExtensionForceUpgradeConfig();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar extensionStoreUrl={forceUpgrade.updateUrl} />
      <main>
        <PricingPlansSection showFaq className="pt-10 md:pt-14" />
      </main>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <LogoIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span>{brandCopyright(new Date().getFullYear())}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
