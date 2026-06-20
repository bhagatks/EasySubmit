import { describe, expect, it } from "vitest";
import { joinProfileName, parseProfileName } from "@/lib/profile/name";

describe("joinProfileName", () => {
  it("joins trimmed first and last names", () => {
    expect(joinProfileName("Jane", "Doe")).toBe("Jane Doe");
    expect(joinProfileName("Jane", "")).toBe("Jane");
  });
});

describe("parseProfileName", () => {
  it("splits a full name into first and last", () => {
    expect(parseProfileName("Jane Doe")).toEqual({
      firstName: "Jane",
      lastName: "Doe",
    });
  });
});
