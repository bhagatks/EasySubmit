import { describe, expect, it } from "vitest";
import {
  formatFullPhone,
  isValidPhoneNumber,
  splitPhoneNumber,
} from "@/lib/phone/phone";

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

describe("isValidPhoneNumber", () => {
  it("requires 10 digits for US +1", () => {
    expect(isValidPhoneNumber("+1", "5551234567")).toBe(true);
    expect(isValidPhoneNumber("+1", "555123456")).toBe(false);
  });
});

describe("formatFullPhone", () => {
  it("formats US numbers with dial code", () => {
    expect(formatFullPhone("+1", "5551234567")).toBe("+1 (555) 123-4567");
  });
});
