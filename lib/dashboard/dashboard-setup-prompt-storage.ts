export const BYOK_SETUP_PROMPT_COMPLETED_SESSION_KEY =
  "easysubmit-byok-setup-prompt-v1";

export function isByokSetupPromptCompleted(
  storage: Pick<Storage, "getItem">,
): boolean {
  return storage.getItem(BYOK_SETUP_PROMPT_COMPLETED_SESSION_KEY) === "1";
}

export function markByokSetupPromptCompleted(
  storage: Pick<Storage, "setItem">,
): void {
  storage.setItem(BYOK_SETUP_PROMPT_COMPLETED_SESSION_KEY, "1");
}
