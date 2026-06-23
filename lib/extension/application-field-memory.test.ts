import { describe, expect, it } from "vitest";
import { isDenylistedApplicationField } from "@/src/shared/extension/field-denylist";

describe("isDenylistedApplicationField", () => {
  it("blocks sensitive labels", () => {
    expect(isDenylistedApplicationField("Social Security Number")).toBe(true);
    expect(isDenylistedApplicationField("Password")).toBe(true);
    expect(isDenylistedApplicationField("Bank account number")).toBe(true);
  });

  it("allows normal application questions", () => {
    expect(isDenylistedApplicationField("Are you authorized to work in the US?")).toBe(false);
    expect(isDenylistedApplicationField("First Name")).toBe(false);
  });
});
