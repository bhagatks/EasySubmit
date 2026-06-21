import Link from "next/link";
import type { Metadata } from "next";
import { LegalPageNav } from "@/components/legal/legal-page-nav";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { LEGAL_PROSE_CLASS, LEGAL_UPDATED_LABEL } from "@/components/legal/legal-prose";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacy Policy | EasySubmit.ai",
  description: "How EasySubmit.ai collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6">
      <article className={cn(LEGAL_PROSE_CLASS, "mx-auto max-w-3xl")}>
        <LegalPageNav />
        <p className="text-sm text-muted-foreground">
          <Link href="/">EasySubmit.ai</Link> · {LEGAL_UPDATED_LABEL}
        </p>
        <h1>Privacy Policy</h1>
        <PrivacyContent />
      </article>
    </main>
  );
}
