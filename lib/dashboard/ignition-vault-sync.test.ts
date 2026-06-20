import { describe, expect, it } from "vitest";
import { shouldResetClientIgnition } from "./ignition-vault-sync";

describe("shouldResetClientIgnition", () => {
  it("resets when server vault is empty but client ignition is complete", () => {
    expect(shouldResetClientIgnition(null, true)).toBe(true);
    expect(shouldResetClientIgnition(undefined, true)).toBe(true);
  });

  it("does not reset when vault exists or client ignition is incomplete", () => {
    expect(shouldResetClientIgnition("vault-id", true)).toBe(false);
    expect(shouldResetClientIgnition(null, false)).toBe(false);
  });
});
