import { describe, expect, it } from "vitest";
import { base64ToUint8Array, uint8ArrayToBase64 } from "@/lib/job-tracker/export/base64";

describe("base64 round-trip", () => {
  it("preserves arbitrary bytes", () => {
    const original = new Uint8Array([0, 1, 127, 255, 72, 101, 108, 108, 111]);
    const encoded = uint8ArrayToBase64(original);
    const decoded = base64ToUint8Array(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("handles empty input", () => {
    const encoded = uint8ArrayToBase64(new Uint8Array());
    expect(base64ToUint8Array(encoded)).toEqual(new Uint8Array());
  });
});
