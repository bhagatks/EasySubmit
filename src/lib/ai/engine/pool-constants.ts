export const PLATFORM_DAILY_CALL_CAP = 3_000;
export const FREE_SLOT_DAILY_CALL_CAP = 1_000;
export const MAX_POOL_ATTEMPTS = 3;
export const DEFAULT_SLOT_MODEL_ID = "deepseek-chat";
export const BILLING_MODE_CACHE_MS = 30_000;

export const SLOT_LABELS = ["Alpha", "Beta", "Gamma"] as const;
export type SystemSlotLabel = (typeof SLOT_LABELS)[number];

export type SystemBillingMode = "free" | "paid";

export function slotLabelForIndex(slot: number): SystemSlotLabel {
  return SLOT_LABELS[slot] ?? `Slot${slot}`;
}
