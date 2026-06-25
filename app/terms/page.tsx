import Link from "next/link";
import type { Metadata } from "next";
import { LegalPageNav } from "@/components/legal/legal-page-nav";
import { TermsContent } from "@/components/legal/terms-content";
import { LEGAL_PROSE_CLASS } from "@/components/legal/legal-prose";
import { getAppConfig } from "@/src/lib/services/config-service";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Terms of Service | ${BRAND.full}`,
  description: `Terms of Service for ${BRAND.full} resume and job application tools.`,
};

export default async function TermsPage() {
  const legalDocuments = await getAppConfig("legalDocuments");
  const { title, updatedLabel, blocks } = legalDocuments.terms;

  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6">
      <article className={cn(LEGAL_PROSE_CLASS, "mx-auto max-w-3xl")}>
        <LegalPageNav />
        <p className="text-sm text-muted-foreground">
          <Link href="/">{BRAND.full}</Link> · {updatedLabel}
        </p>
        <h1>{title}</h1>
        <TermsContent blocks={blocks} />
      </article>
    </main>
  );
}
