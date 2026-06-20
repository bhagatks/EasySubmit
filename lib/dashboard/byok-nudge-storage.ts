export const BYOK_NUDGE_STORAGE_KEY = "easysubmit-byok-nudge-v1";

export function isByokNudgeDismissed(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(BYOK_NUDGE_STORAGE_KEY) === "1";
}

export function dismissByokNudge(storage: Pick<Storage, "setItem">): void {
  storage.setItem(BYOK_NUDGE_STORAGE_KEY, "1");
}
