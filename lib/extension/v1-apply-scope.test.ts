import { describe, expect, it } from "vitest";
import { V1_OFFER_AUTOFILL_PHASE } from "@/src/shared/extension/v1-apply-scope";

describe("v1-apply-scope", () => {
  it("disables autofill / one-click pending phase for v1", () => {
    expect(V1_OFFER_AUTOFILL_PHASE).toBe(false);
  });
});
