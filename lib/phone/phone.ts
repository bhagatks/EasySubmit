import {
  COUNTRY_CODE_OPTIONS,
  DEFAULT_DIAL_CODE,
  getDialCodesSorted,
} from "@/lib/phone/countryCodes";

export type SplitPhoneNumber = {
  dialCode: string;
  nationalNumber: string;
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatNationalNumber(dialCode: string, nationalNumber: string): string {
  const digits = digitsOnly(nationalNumber);

  if (dialCode === "+1" && digits.length <= 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6, 10);

    if (digits.length <= 3) return area;
    if (digits.length <= 6) return `(${area}) ${prefix}`;
    return `(${area}) ${prefix}-${line}`;
  }

  return digits;
}

export function formatFullPhone(dialCode: string, nationalNumber: string): string {
  const digits = digitsOnly(nationalNumber);
  if (!digits) return "";

  const formattedNational = formatNationalNumber(dialCode, digits);
  return `${dialCode} ${formattedNational}`.trim();
}

export function splitPhoneNumber(phone: string): SplitPhoneNumber {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { dialCode: DEFAULT_DIAL_CODE, nationalNumber: "" };
  }

  const compact = trimmed.replace(/[^\d+]/g, "");

  if (compact.startsWith("+")) {
    for (const dialCode of getDialCodesSorted()) {
      if (compact.startsWith(dialCode)) {
        return {
          dialCode,
          nationalNumber: digitsOnly(compact.slice(dialCode.length)),
        };
      }
    }
  }

  const digits = digitsOnly(compact);
  if (digits.length === 11 && digits.startsWith("1")) {
    return { dialCode: "+1", nationalNumber: digits.slice(1) };
  }
  if (digits.length === 10) {
    return { dialCode: DEFAULT_DIAL_CODE, nationalNumber: digits };
  }

  return { dialCode: DEFAULT_DIAL_CODE, nationalNumber: digits };
}

export function isValidPhoneNumber(dialCode: string, nationalNumber: string): boolean {
  const digits = digitsOnly(nationalNumber);
  if (!digits) return false;

  if (dialCode === "+1") {
    return digits.length === 10;
  }

  if (dialCode === "+44") {
    return digits.length >= 10 && digits.length <= 11;
  }

  if (dialCode === "+91") {
    return digits.length === 10;
  }

  const country = COUNTRY_CODE_OPTIONS.find((entry) => entry.dialCode === dialCode);
  if (!country) {
    return digits.length >= 7 && digits.length <= 15;
  }

  return digits.length >= 7 && digits.length <= 15;
}
