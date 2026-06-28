import { describe, expect, it } from "vitest";
import {
  digitsOnly,
  formatFullPhone,
  formatNationalNumber,
  isValidPhoneNumber,
  splitPhoneNumber,
} from "@/lib/phone/phone";

describe("digitsOnly", () => {
  it("strips non-digit characters", () => {
    expect(digitsOnly("+1 (555) 123-4567")).toBe("15551234567");
  });

  it("returns empty string for all non-digits", () => {
    expect(digitsOnly("abc")).toBe("");
  });
});

describe("formatNationalNumber", () => {
  it("formats 3-digit US number (area only)", () => {
    expect(formatNationalNumber("+1", "555")).toBe("555");
  });

  it("formats 6-digit US number (area + prefix)", () => {
    expect(formatNationalNumber("+1", "555123")).toBe("(555) 123");
  });

  it("formats full 10-digit US number", () => {
    expect(formatNationalNumber("+1", "5551234567")).toBe("(555) 123-4567");
  });

  it("returns digits for non-US dial codes", () => {
    expect(formatNationalNumber("+44", "2079460958")).toBe("2079460958");
  });
});

describe("splitPhoneNumber", () => {
  it("splits US numbers with country code", () => {
    expect(splitPhoneNumber("+1 (555) 123-4567")).toEqual({
      dialCode: "+1",
      nationalNumber: "5551234567",
    });
  });

  it("defaults bare 10-digit numbers to US +1", () => {
    expect(splitPhoneNumber("5551234567")).toEqual({
      dialCode: "+1",
      nationalNumber: "5551234567",
    });
  });

  it("splits UK numbers", () => {
    expect(splitPhoneNumber("+44 20 7946 0958")).toEqual({
      dialCode: "+44",
      nationalNumber: "2079460958",
    });
  });
});

describe("splitPhoneNumber edge cases", () => {
  it("returns default dial code for empty string", () => {
    expect(splitPhoneNumber("")).toEqual({ dialCode: "+1", nationalNumber: "" });
  });

  it("handles 11-digit US number starting with 1", () => {
    expect(splitPhoneNumber("15551234567")).toEqual({
      dialCode: "+1",
      nationalNumber: "5551234567",
    });
  });

  it("falls back to default for unrecognized format", () => {
    const result = splitPhoneNumber("123456");
    expect(result.nationalNumber).toBe("123456");
  });
});

describe("isValidPhoneNumber", () => {
  it("requires 10 digits for US +1", () => {
    expect(isValidPhoneNumber("+1", "5551234567")).toBe(true);
    expect(isValidPhoneNumber("+1", "555123456")).toBe(false);
  });

  it("returns false for empty national number", () => {
    expect(isValidPhoneNumber("+1", "")).toBe(false);
  });

  it("validates UK +44 numbers (10-11 digits)", () => {
    expect(isValidPhoneNumber("+44", "2079460958")).toBe(true);
    expect(isValidPhoneNumber("+44", "207946")).toBe(false);
  });

  it("validates India +91 numbers (10 digits)", () => {
    expect(isValidPhoneNumber("+91", "9876543210")).toBe(true);
    expect(isValidPhoneNumber("+91", "987654321")).toBe(false);
  });

  it("uses 7-15 digit range for unknown dial codes", () => {
    expect(isValidPhoneNumber("+999", "1234567")).toBe(true);
    expect(isValidPhoneNumber("+999", "123456")).toBe(false);
  });
});

describe("formatFullPhone", () => {
  it("formats US numbers with dial code", () => {
    expect(formatFullPhone("+1", "5551234567")).toBe("+1 (555) 123-4567");
  });

  it("returns empty string for empty national number", () => {
    expect(formatFullPhone("+1", "")).toBe("");
  });

  it("formats non-US numbers as raw digits", () => {
    expect(formatFullPhone("+44", "2079460958")).toBe("+44 2079460958");
  });
});
