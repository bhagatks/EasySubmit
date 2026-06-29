"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Briefcase, Check, ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fuzzySearchPopularRoles,
  isExactPopularRole,
} from "@/src/lib/constants/roles";
import { ClipboardButton } from "@/src/components/shared/ClipboardButton";
import { STUDIO_FIELD_ERROR_CLASS } from "@/lib/resume/studio-field-styles";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const CANVAS = "oklch(0.16 0.04 268)";
const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";
const INK = "oklch(0.98 0.01 268)";
const PRIMARY = "oklch(0.62 0.21 265)";

const FOCUS_RING =
  "focus:border-[oklch(0.62_0.21_265_/_0.55)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.62_0.21_265_/_0.35)]";

type TargetRoleFieldProps = {
  /** Committed role from global state — set only via list/custom selection. */
  value: string;
  onChange: (value: string) => void;
  monoClass?: string;
  id?: string;
  hasBlockingError?: boolean;
};

export function TargetRoleField({
  value,
  onChange,
  monoClass,
  id = "hub-target-role",
  hasBlockingError = false,
}: TargetRoleFieldProps) {
  const labelMono = monoClass ?? jetbrainsMono.className;
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const trimmedQuery = query.trim();
  const suggestions = useMemo(
    () => fuzzySearchPopularRoles(query, 10),
    [query],
  );

  const showCustomOption =
    trimmedQuery.length > 0 && !isExactPopularRole(trimmedQuery);

  const commitRole = useCallback(
    (role: string) => {
      const next = role.trim();
      onChange(next);
      setQuery(next);
    },
    [onChange],
  );

  function handleInputChange(next: string) {
    setQuery(next);
    if (next.trim() !== value.trim()) {
      onChange("");
    }
  }

  return (
    <div>
      <label
        htmlFor={id}
        className={cn(
          labelMono,
          "mb-2 block text-[11px] font-medium uppercase tracking-[0.18em]",
        )}
        style={{ color: MUTED }}
      >
        ID_ROLE_TARGET <span style={{ color: MINT }}>*</span>
      </label>

      <Combobox
        immediate
        value={value || null}
        onChange={(selected: string | null) => {
          if (selected) commitRole(selected);
        }}
        onClose={() => setQuery(value)}
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Briefcase
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2"
              style={{ color: MINT }}
              aria-hidden="true"
            />
            <ComboboxInput
              id={id}
              autoComplete="off"
              name="es-coordinates-target-role"
              displayValue={() => query}
              onChange={(event) => handleInputChange(event.target.value)}
              placeholder="e.g. Full Stack Developer"
              className={cn(
                inter.className,
                "w-full rounded-xl border border-white/10 py-3 pl-10 pr-10 text-sm transition-colors",
                FOCUS_RING,
                hasBlockingError && STUDIO_FIELD_ERROR_CLASS,
              )}
              style={{
                backgroundColor: CANVAS,
                color: INK,
              }}
            />
            <ChevronsUpDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: MUTED }}
              aria-hidden="true"
            />
          </div>

          {value.trim() ? (
            <ClipboardButton
              value={value.trim()}
              label="Copy career architecture coordinate"
            />
          ) : null}
        </div>

        <ComboboxOptions
          anchor="bottom start"
          className={cn(
            inter.className,
            "z-30 mt-2 max-h-60 w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-white/10 shadow-[0_16px_40px_oklch(0_0_0_/_0.35)] empty:hidden",
          )}
          style={{ backgroundColor: CANVAS }}
        >
          {suggestions.length === 0 && !showCustomOption ? (
            <div
              className="px-4 py-3 text-sm"
              style={{ color: MUTED }}
            >
              No matching roles
            </div>
          ) : null}

          {suggestions.map((role) => (
            <ComboboxOption
              key={role}
              value={role}
              className={({ focus, selected }) =>
                cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors data-[focus]:bg-white/[0.08]",
                  (focus || selected) && "bg-white/[0.05]",
                )
              }
            >
              {({ selected }) => (
                <>
                  <span style={{ color: selected ? PRIMARY : INK }}>{role}</span>
                  {selected ? (
                    <Check className="h-4 w-4 shrink-0" style={{ color: PRIMARY }} />
                  ) : null}
                </>
              )}
            </ComboboxOption>
          ))}

          {showCustomOption ? (
            <ComboboxOption
              value={trimmedQuery}
              className={({ focus }) =>
                cn(
                  "cursor-pointer border-t border-white/10 px-4 py-2.5 text-sm transition-colors data-[focus]:bg-white/[0.08]",
                  focus && "bg-white/[0.05]",
                )
              }
            >
              <span style={{ color: MINT }}>
                Create custom role:{" "}
                <span className="font-medium" style={{ color: INK }}>
                  {trimmedQuery}
                </span>
              </span>
            </ComboboxOption>
          ) : null}
        </ComboboxOptions>
      </Combobox>
    </div>
  );
}
