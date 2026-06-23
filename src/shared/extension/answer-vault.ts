/**
 * Answer Vault — per-question answer memory that persists across job applications.
 *
 * Learns from each application: when a user fills "Years of Python experience?" → 5,
 * the next application auto-fills that field instantly. Grows smarter over time.
 * Stored in chrome.storage.sync so it follows the user across devices.
 *
 * Key format: normalized question text (lowercased, stripped of punctuation, truncated).
 * Collision risk is negligible for question strings — they are highly unique.
 */

const VAULT_STORAGE_KEY = "es_answer_vault_v1";
const MAX_VAULT_ENTRIES = 500;
const KEY_MAX_LEN = 120;

export type VaultEntry = {
  answer: string;
  /** ISO timestamp of last use — used to evict oldest entries when vault is full */
  usedAt: string;
  /** How many times this answer was accepted without user editing */
  hitCount: number;
};

export type AnswerVault = Record<string, VaultEntry>;

function normalizeKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, KEY_MAX_LEN);
}

export async function vaultGet(question: string): Promise<string | null> {
  try {
    const key = normalizeKey(question);
    if (!key) return null;
    const stored = await chrome.storage.sync.get(VAULT_STORAGE_KEY);
    const vault: AnswerVault = stored[VAULT_STORAGE_KEY] ?? {};
    return vault[key]?.answer ?? null;
  } catch {
    return null;
  }
}

export async function vaultSet(question: string, answer: string): Promise<void> {
  if (!answer.trim()) return;
  try {
    const key = normalizeKey(question);
    if (!key) return;

    const stored = await chrome.storage.sync.get(VAULT_STORAGE_KEY);
    const vault: AnswerVault = stored[VAULT_STORAGE_KEY] ?? {};

    const existing = vault[key];
    vault[key] = {
      answer: answer.trim(),
      usedAt: new Date().toISOString(),
      hitCount: existing ? existing.hitCount + 1 : 1,
    };

    // Evict oldest entries when over limit
    const entries = Object.entries(vault);
    if (entries.length > MAX_VAULT_ENTRIES) {
      entries.sort((a, b) => a[1].usedAt.localeCompare(b[1].usedAt));
      const keep = entries.slice(entries.length - MAX_VAULT_ENTRIES);
      const pruned: AnswerVault = {};
      for (const [k, v] of keep) pruned[k] = v;
      await chrome.storage.sync.set({ [VAULT_STORAGE_KEY]: pruned });
    } else {
      await chrome.storage.sync.set({ [VAULT_STORAGE_KEY]: vault });
    }
  } catch {
    // Non-fatal
  }
}

export async function vaultGetMany(questions: string[]): Promise<Record<string, string>> {
  try {
    const stored = await chrome.storage.sync.get(VAULT_STORAGE_KEY);
    const vault: AnswerVault = stored[VAULT_STORAGE_KEY] ?? {};
    const result: Record<string, string> = {};
    for (const q of questions) {
      const key = normalizeKey(q);
      if (vault[key]) result[q] = vault[key].answer;
    }
    return result;
  } catch {
    return {};
  }
}

export async function vaultClear(): Promise<void> {
  await chrome.storage.sync.remove(VAULT_STORAGE_KEY);
}

export async function vaultSize(): Promise<number> {
  try {
    const stored = await chrome.storage.sync.get(VAULT_STORAGE_KEY);
    return Object.keys(stored[VAULT_STORAGE_KEY] ?? {}).length;
  } catch {
    return 0;
  }
}
