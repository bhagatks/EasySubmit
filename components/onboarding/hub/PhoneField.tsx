"use client";

import { ChevronDown, Phone } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  COUNTRY_CODE_OPTIONS,
  findCountryByDialCode,
  type CountryCodeOption,
} from "@/lib/phone/countryCodes";
import {
  formatNationalNumber,
  isValidPhoneNumber,
} from "@/lib/phone/phone";
import { cn } from "@/lib/utils";

type PhoneFieldProps = {
  dialCode: string;
  nationalNumber: string;
  onDialCodeChange: (dialCode: string) => void;
  onNationalNumberChange: (value: string) => void;
  inputClass: string;
  id?: string;
  monoClass?: string;
  showIcon?: boolean;
  invalid?: boolean;
};

const CANVAS = "oklch(0.16 0.04 268)";
const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";
const INK = "oklch(0.98 0.01 268)";

export function PhoneField({
  dialCode,
  nationalNumber,
  onDialCodeChange,
  onNationalNumberChange,
  inputClass,
  id,
  monoClass,
  showIcon = true,
  invalid = false,
}: PhoneFieldProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedIso, setSelectedIso] = useState(() =>
    findCountryByDialCode(dialCode)?.iso ?? COUNTRY_CODE_OPTIONS[0].iso,
  );

  const valid = isValidPhoneNumber(dialCode, nationalNumber);
  const showInvalid = invalid || (nationalNumber.trim().length > 0 && !valid);

  useEffect(() => {
    const match = COUNTRY_CODE_OPTIONS.find(
      (country) => country.iso === selectedIso && country.dialCode === dialCode,
    );
    if (match) return;

    const byDial = findCountryByDialCode(dialCode);
    if (byDial) setSelectedIso(byDial.iso);
  }, [dialCode, selectedIso]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function pickCountry(country: CountryCodeOption) {
    setSelectedIso(country.iso);
    onDialCodeChange(country.dialCode);
    setOpen(false);
  }

  return (
    <div className="flex gap-2">
      <div ref={containerRef} className="relative shrink-0">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            monoClass,
            inputClass,
            "flex w-[4.25rem] items-center justify-between gap-1 px-2.5 text-sm tabular-nums",
            showInvalid && "border-[oklch(0.65_0.2_25_/_0.5)]",
          )}
          style={{ color: INK }}
        >
          <span>{dialCode}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              open && "rotate-180",
            )}
            style={{ color: MUTED }}
            aria-hidden="true"
          />
        </button>

        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Country"
            className="absolute z-30 mt-2 max-h-56 w-56 overflow-y-auto rounded-xl border border-white/10 shadow-[0_16px_40px_oklch(0_0_0_/_0.35)]"
            style={{ backgroundColor: CANVAS }}
          >
            {COUNTRY_CODE_OPTIONS.map((country) => {
              const isSelected = country.iso === selectedIso;

              return (
                <li key={country.iso} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => pickCountry(country)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06]",
                      isSelected && "bg-white/[0.04]",
                    )}
                    style={{ color: isSelected ? MINT : INK }}
                  >
                    <span aria-hidden="true">{country.flag}</span>
                    <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="relative min-w-0 flex-1">
        {showIcon ? (
          <Phone
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: MINT }}
            aria-hidden="true"
          />
        ) : null}
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={nationalNumber}
          onChange={(event) => {
            const formatted = formatNationalNumber(dialCode, event.target.value);
            onNationalNumberChange(formatted);
          }}
          placeholder={dialCode === "+1" ? "(555) 555-5555" : "Phone number"}
          className={cn(
            inputClass,
            showIcon && "pl-10",
            showInvalid && "border-[oklch(0.65_0.2_25_/_0.5)]",
          )}
        />
      </div>
    </div>
  );
}
