"use client";

import {
  LegalDocumentLink,
  useLegalDocumentOverlay,
  type LegalOverlayPlacement,
} from "@/components/legal/legal-document-overlay";
import { cn } from "@/lib/utils";

type TermsPrivacyConsentProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Dark glass styling for login / onboarding panels. */
  variant?: "default" | "glass";
  /** Login page: center modal in the right auth column on desktop. */
  overlayPlacement?: LegalOverlayPlacement;
};

/** Reusable terms checkbox with in-app overlay links (no full-page navigation). */
export function TermsPrivacyConsent({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  variant = "default",
  overlayPlacement = "center",
}: TermsPrivacyConsentProps) {
  const { openDocument, overlay } = useLegalDocumentOverlay(overlayPlacement);

  const isGlass = variant === "glass";

  return (
    <>
      {overlay}
      <label
        className={cn(
          "flex w-full cursor-pointer items-start gap-2.5 text-left text-xs leading-relaxed",
          isGlass
            ? "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-muted-foreground"
            : "text-muted-foreground",
          className,
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          disabled={disabled}
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded accent-primary",
            isGlass ? "border-white/20 accent-[oklch(0.82_0.16_165)]" : "border-border",
          )}
        />
        <span>
          I agree to the{" "}
          <LegalDocumentLink documentId="terms" onOpen={openDocument}>
            Terms of Service
          </LegalDocumentLink>{" "}
          and{" "}
          <LegalDocumentLink documentId="privacy" onOpen={openDocument}>
            Privacy Policy
          </LegalDocumentLink>
          .
        </span>
      </label>
    </>
  );
}
