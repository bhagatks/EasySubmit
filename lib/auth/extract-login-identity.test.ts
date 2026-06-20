import { describe, expect, it } from "vitest";
import { extractLoginIdentity } from "@/lib/auth/extract-login-identity";

describe("extractLoginIdentity", () => {
  it("prefers given_name and family_name when present", () => {
    expect(
      extractLoginIdentity({
        name: "Ignored Full",
        given_name: "Jane",
        family_name: "Doe",
      }),
    ).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      displayName: "Jane Doe",
    });
  });

  it("splits a single name string when structured claims are missing", () => {
    expect(extractLoginIdentity({ name: "Alex Rivera" })).toEqual({
      firstName: "Alex",
      lastName: "Rivera",
      displayName: "Alex Rivera",
    });
  });

  it("fills last name from full name when Google sends given_name only", () => {
    expect(
      extractLoginIdentity({
        name: "Jane Doe",
        given_name: "Jane",
      }),
    ).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      displayName: "Jane Doe",
    });
  });

  it("handles single-token names", () => {
    expect(extractLoginIdentity({ name: "Madonna" })).toEqual({
      firstName: "Madonna",
      lastName: "",
      displayName: "Madonna",
    });
  });
});
