"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type LegalPageNavProps = {
  fallbackHref?: string;
};

/** Back control for standalone /terms and /privacy pages (direct links, SEO). */
export function LegalPageNav({ fallbackHref = "/dashboard/settings" }: LegalPageNavProps) {
  const router = useRouter();

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl gap-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </Button>
      <Link
        href={fallbackHref}
        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        Return to dashboard
      </Link>
    </div>
  );
}
