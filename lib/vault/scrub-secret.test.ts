import { describe, expect, it } from "vitest";
import {
  createEphemeralSecret,
  readEphemeralSecret,
  scrubEphemeralSecret,
} from "@/lib/vault/scrub-secret";

describe("scrub-secret", () => {
  it("stores trimmed secrets in an ephemeral ref", () => {
    const ref = createEphemeralSecret("  sk-live-test  ");
    expect(readEphemeralSecret(ref)).toBe("sk-live-test");
  });

  it("scrubs the ref so the secret is no longer readable", () => {
    const ref = createEphemeralSecret("sk-live-test");
    scrubEphemeralSecret(ref);
    expect(readEphemeralSecret(ref)).toBeNull();
  });

  it("treats blank input as null", () => {
    const ref = createEphemeralSecret("   ");
    expect(readEphemeralSecret(ref)).toBeNull();
  });
});
