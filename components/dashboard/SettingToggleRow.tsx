"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  icon,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/30 px-3 py-2.5",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
