import { LegalDocumentRenderer } from "@/components/legal/legal-document-renderer";
import {
  LEGAL_DOCUMENTS_DEFAULTS,
  type LegalBlock,
} from "@/src/lib/services/legal-documents-config";

type TermsContentProps = {
  blocks?: LegalBlock[];
  /** When set, Privacy Policy opens in-app overlay instead of navigating away. */
  onOpenPrivacy?: () => void;
};

export function TermsContent({ blocks, onOpenPrivacy }: TermsContentProps) {
  return (
    <LegalDocumentRenderer
      blocks={blocks ?? LEGAL_DOCUMENTS_DEFAULTS.terms.blocks}
      onDocLink={
        onOpenPrivacy
          ? (doc) => {
              if (doc === "privacy") {
                onOpenPrivacy();
              }
            }
          : undefined
      }
    />
  );
}
