import { LegalDocumentRenderer } from "@/components/legal/legal-document-renderer";
import {
  LEGAL_DOCUMENTS_DEFAULTS,
  type LegalBlock,
} from "@/src/lib/services/legal-documents-config";

type PrivacyContentProps = {
  blocks?: LegalBlock[];
  onOpenTerms?: () => void;
};

export function PrivacyContent({ blocks, onOpenTerms }: PrivacyContentProps) {
  return (
    <LegalDocumentRenderer
      blocks={blocks ?? LEGAL_DOCUMENTS_DEFAULTS.privacy.blocks}
      onDocLink={
        onOpenTerms
          ? (doc) => {
              if (doc === "terms") {
                onOpenTerms();
              }
            }
          : undefined
      }
    />
  );
}
