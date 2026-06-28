import { describe, expect, it } from "vitest";
import {
  BYOK_SETUP_PROMPT_COMPLETED_SESSION_KEY,
  isByokSetupPromptCompleted,
  markByokSetupPromptCompleted,
} from "@/lib/dashboard/dashboard-setup-prompt-storage";

describe("dashboard-setup-prompt-storage", () => {
  it("tracks BYOK setup prompt completion in session storage", () => {
    const storage = new Map<string, string>();
    const session = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };

    expect(isByokSetupPromptCompleted(session)).toBe(false);
    markByokSetupPromptCompleted(session);
    expect(storage.get(BYOK_SETUP_PROMPT_COMPLETED_SESSION_KEY)).toBe("1");
    expect(isByokSetupPromptCompleted(session)).toBe(true);
  });
});
