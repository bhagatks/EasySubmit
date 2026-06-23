import { LEGAL_DOCUMENTS_DEFAULTS } from "@/src/lib/services/legal-documents-config";

/** Shared typography for legal pages and overlay panels. */
export const LEGAL_PROSE_CLASS =
  "text-left prose prose-sm prose-neutral max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline";

/** Default updated label (from bundled legal defaults / seed). */
export const LEGAL_UPDATED_LABEL = LEGAL_DOCUMENTS_DEFAULTS.terms.updatedLabel;
