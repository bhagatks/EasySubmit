import { describe, expect, it } from "vitest";
import {
  BYOK_NUDGE_STORAGE_KEY,
  dismissByokNudge,
  isByokNudgeDismissed,
} from "./byok-nudge-storage";

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

describe("byok-nudge-storage", () => {
  it("tracks dismiss state in localStorage", () => {
    const storage = createStorageMock();
    expect(isByokNudgeDismissed(storage)).toBe(false);
    dismissByokNudge(storage);
    expect(storage.getItem(BYOK_NUDGE_STORAGE_KEY)).toBe("1");
    expect(isByokNudgeDismissed(storage)).toBe(true);
  });
});
