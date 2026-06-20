import { describe, expect, it } from "vitest";
import {
  decryptSessionApiKey,
  encryptSessionApiKey,
} from "@/src/lib/ai/session-key-vault";

describe("session-key-vault", () => {
  it("round-trips API keys through encrypted session payload", async () => {
    const plain = "sk-test-key-12345";
    const encrypted = await encryptSessionApiKey(plain);

    expect(encrypted).not.toBe(plain);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = await decryptSessionApiKey(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("returns null for empty cipher input", async () => {
    expect(await decryptSessionApiKey("")).toBeNull();
  });
});
