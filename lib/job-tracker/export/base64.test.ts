import { describe, expect, it } from "vitest";
import { base64ToUint8Array, uint8ArrayToBase64 } from "@/lib/job-tracker/export/base64";

describe("base64", () => {
  it("round-trips bytes through base64", () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]);
    const encoded = uint8ArrayToBase64(original);
    expect(base64ToUint8Array(encoded)).toEqual(original);
  });

  it("encodes empty array", () => {
    expect(uint8ArrayToBase64(new Uint8Array())).toBe("");
  });

  it("decodes known base64 string", () => {
    const result = base64ToUint8Array("SGVsbG8=");
    expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("round-trips arbitrary bytes", () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]);
    expect(base64ToUint8Array(uint8ArrayToBase64(original))).toEqual(original);
  });
});
