import { describe, expect, it } from "vitest";
import { deepClone } from "@/lib/resume/openResume/deep-clone";

describe("deepClone", () => {
  it("clones nested objects", () => {
    const original = { a: 1, nested: { b: [2, 3] } };
    const cloned = deepClone(original);
    cloned.nested.b.push(4);
    expect(original.nested.b).toEqual([2, 3]);
  });
});
