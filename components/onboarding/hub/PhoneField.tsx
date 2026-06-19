"use client";

import { Phone } from "lucide-react";
import { useId } from "react";
import { COUNTRY_CODE_OPTIONS } from "@/lib/phone/countryCodes";
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
  const selectId = useId();
  const valid = isValidPhoneNumber(dialCode, nationalNumber);
  const showInvalid = invalid || (nationalNumber.trim().length > 0 && !valid);

  return (
    <div className="flex gap-2">
      <div className="relative shrink-0">
        <select
          id={selectId}
          value={dialCode}
          onChange={(event) => onDialCodeChange(event.target.value)}
          aria-label="Country code"
          className={cn(
            monoClass,
            inputClass,
            "w-[7.5rem] appearance-none pr-7 text-xs",
            showInvalid && "border-[oklch(0.65_0.2_25_/_0.5)]",
          )}
        >
          {COUNTRY_CODE_OPTIONS.map((country) => (
            <option key={`${country.iso}-${country.dialCode}`} value={country.dialCode}>
              {country.flag} {country.dialCode}
            </option>
          ))}
        </select>
      </div>

      <div className="relative min-w-0 flex-1">
        {showIcon ? (
          <Phone
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "oklch(0.82 0.16 165)" }}
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
