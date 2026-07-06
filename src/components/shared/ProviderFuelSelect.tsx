"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ProviderIcon } from "@/src/components/shared/ProviderIcon";
import {
  getProviderRegistryEntry,
  type AiProvider,
} from "@/src/lib/config/app.config";
import { HANDSHAKE_PROVIDERS } from "@/src/lib/config/career-grade-models";

export type ProviderFuelSelectProps = {
  value: AiProvider;
  onChange: (provider: AiProvider) => void;
  disabled?: boolean;
  monoClass?: string;
  /** Raise above full-screen overlays (Key Protector uses z-[110]+). */
  menuZIndexClass?: string;
};

export function ProviderFuelSelect({
  value,
  onChange,
  disabled = false,
  monoClass,
  menuZIndexClass = "z-[130]",
}: ProviderFuelSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = getProviderRegistryEntry(value);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selectProvider = (providerId: AiProvider) => {
    onChange(providerId);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", menuZIndexClass)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className={cn(
          monoClass,
          "flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[oklch(0.14_0.03_268)] px-3 py-3 text-left text-[12px] text-[oklch(0.98_0.01_268)] transition-colors hover:border-white/20 focus:border-[oklch(0.62_0.21_265/0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265/0.35)] disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <ProviderIcon icon={selected.icon} className="text-[oklch(0.82_0.16_165)]" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{selected.label}</span>
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[oklch(0.55_0.02_268)] transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="AI provider"
          className={cn(
            monoClass,
            "absolute left-0 right-0 top-[calc(100%+0.5rem)] max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[oklch(0.12_0.03_268)] p-1 shadow-[0_16px_40px_oklch(0_0_0/0.35)]",
          )}
        >
          {HANDSHAKE_PROVIDERS.map((providerId) => {
            const entry = getProviderRegistryEntry(providerId);
            const isSelected = providerId === value;

            return (
              <li key={providerId} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectProvider(providerId)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-[12px] text-[oklch(0.88_0.02_268)] transition-colors hover:bg-white/[0.06]",
                    isSelected && "bg-[oklch(0.82_0.16_165/0.1)]",
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <ProviderIcon
                      icon={entry.icon}
                      className={cn(
                        "text-[oklch(0.75_0.02_268)]",
                        isSelected && "text-[oklch(0.82_0.16_165)]",
                      )}
                    />
                    <span className="truncate">{entry.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isSelected ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-[oklch(0.82_0.16_165)]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
