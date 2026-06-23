"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { getLegalDocuments } from "@/app/actions/legal-documents";
import { Button } from "@/components/ui/button";
import { GlossySheen } from "@/components/ui/glossy-sheen";
import { GLOSSY_OVERLAY_CLASS, GLOSSY_PANEL_CLASS } from "@/components/ui/glossy-tokens";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { TermsContent } from "@/components/legal/terms-content";
import { LEGAL_PROSE_CLASS } from "@/components/legal/legal-prose";
import {
  LEGAL_DOCUMENTS_DEFAULTS,
  type LegalDocumentsConfig,
} from "@/src/lib/services/legal-documents-config";
import { cn } from "@/lib/utils";

export type LegalDocumentId = "terms" | "privacy";

export type LegalOverlayPlacement = "center" | "login-panel";

type LegalDocumentOverlayProps = {
  open: boolean;
  documentId: LegalDocumentId | null;
  onOpenChange: (open: boolean) => void;
  onDocumentChange?: (documentId: LegalDocumentId) => void;
  placement?: LegalOverlayPlacement;
  className?: string;
  /** Optional preloaded config (e.g. from a server component). Falls back to defaults then DB fetch. */
  documents?: LegalDocumentsConfig;
};

/**
 * Glossy in-app legal reader — custom overlay (avoids Radix transform conflicts on login).
 */
export function LegalDocumentOverlay({
  open,
  documentId,
  onOpenChange,
  onDocumentChange,
  placement = "center",
  className,
  documents: documentsProp,
}: LegalDocumentOverlayProps) {
  const [documents, setDocuments] = useState<LegalDocumentsConfig>(
    documentsProp ?? LEGAL_DOCUMENTS_DEFAULTS,
  );

  useEffect(() => {
    if (documentsProp) {
      setDocuments(documentsProp);
    }
  }, [documentsProp]);

  useEffect(() => {
    if (documentsProp) {
      return;
    }
    let cancelled = false;
    void getLegalDocuments().then((loaded) => {
      if (!cancelled) {
        setDocuments(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [documentsProp]);

  const switchDocument = useCallback(
    (next: LegalDocumentId) => {
      onDocumentChange?.(next);
    },
    [onDocumentChange],
  );

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  const activeDocument = documentId ? documents[documentId] : null;

  return (
    <AnimatePresence>
      {open && documentId && activeDocument ? (
        <motion.div
          key="legal-document-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-[100] flex items-start px-4 pt-[max(1rem,5dvh)]",
            placement === "login-panel"
              ? "justify-center lg:justify-end lg:pr-[25px]"
              : "justify-center",
          )}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Dismiss"
            className={cn("absolute inset-0 z-0", GLOSSY_OVERLAY_CLASS)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-document-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={cn(
              "pointer-events-auto relative z-10 flex max-h-[min(90dvh,720px)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden text-left",
              GLOSSY_PANEL_CLASS,
              className,
            )}
          >
            <GlossySheen />

            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <header className="relative z-10 shrink-0 space-y-1 border-b border-white/10 px-5 py-4 pr-12 text-left">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {activeDocument.updatedLabel}
              </p>
              <h2
                id="legal-document-title"
                className="font-display text-lg font-semibold text-foreground"
              >
                {activeDocument.title}
              </h2>
            </header>

            <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-left">
              <article className={LEGAL_PROSE_CLASS}>
                {documentId === "terms" ? (
                  <TermsContent
                    blocks={activeDocument.blocks}
                    onOpenPrivacy={() => switchDocument("privacy")}
                  />
                ) : (
                  <PrivacyContent
                    blocks={activeDocument.blocks}
                    onOpenTerms={() => switchDocument("terms")}
                  />
                )}
              </article>
            </div>

            <div className="relative z-10 shrink-0 border-t border-white/10 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-white/15 bg-white/5 hover:bg-white/10"
                onClick={close}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Hook + overlay bundle for opening Terms or Privacy from any client component. */
export function useLegalDocumentOverlay(
  placement: LegalOverlayPlacement = "center",
  documents?: LegalDocumentsConfig,
) {
  const [open, setOpen] = useState(false);
  const [documentId, setDocumentId] = useState<LegalDocumentId | null>(null);

  const openDocument = useCallback((id: LegalDocumentId) => {
    setDocumentId(id);
    setOpen(true);
  }, []);

  const overlay = (
    <LegalDocumentOverlay
      open={open}
      documentId={documentId}
      onOpenChange={setOpen}
      onDocumentChange={setDocumentId}
      placement={placement}
      documents={documents}
    />
  );

  return { openDocument, overlay, open, documentId };
}

type LegalDocumentLinkProps = {
  documentId: LegalDocumentId;
  onOpen: (documentId: LegalDocumentId) => void;
  children: ReactNode;
  className?: string;
};

/** Inline text button styled as a link — opens {@link LegalDocumentOverlay}. */
export function LegalDocumentLink({
  documentId,
  onOpen,
  children,
  className,
}: LegalDocumentLinkProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen(documentId);
      }}
      className={cn(
        "font-medium text-primary underline-offset-2 hover:underline",
        className,
      )}
    >
      {children}
    </button>
  );
}
