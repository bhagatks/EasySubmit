"use client";

import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GLOSSY_MINT,
  GLOSSY_MINT_10,
  GLOSSY_MINT_12,
  GLOSSY_MINT_50,
  GLOSSY_MUTED_RGB,
  GLOSSY_NAVY_35,
} from "@/components/ui/glossy-tokens";
import { cn } from "@/lib/utils";
const COPIED_MS = 1000;

export type ClipboardButtonProps = {
  value: string;
  /** Accessible label when idle (icon-only UI). */
  label?: string;
  copiedLabel?: string;
  className?: string;
  disabled?: boolean;
};

/** Minimal copy-to-clipboard control with mint pulse feedback. */
export function ClipboardButton({
  value,
  label = "Copy career coordinate",
  copiedLabel = "Copied",
  className,
  disabled = false,
}: ClipboardButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(async () => {
    const text = value.trim();
    if (!text || disabled || copied) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, COPIED_MS);
    } catch {
      // Clipboard API may be unavailable outside secure context.
    }
  }, [copied, disabled, value]);

  const isDisabled = disabled || !value.trim();

  return (
    <motion.button
      type="button"
      onClick={() => void handleClick()}
      disabled={isDisabled}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      animate={{
        backgroundColor: copied
          ? [GLOSSY_MINT_12, GLOSSY_MINT_50, GLOSSY_MINT_10]
          : GLOSSY_NAVY_35,
      }}
      transition={{ duration: COPIED_MS / 1000, ease: "easeOut" }}
      style={{ color: copied ? GLOSSY_MINT : GLOSSY_MUTED_RGB }}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </motion.button>
  );
}
