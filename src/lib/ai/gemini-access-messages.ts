/** User-facing copy when Google returns project/account-level Gemini API denial. */
export const GEMINI_ACCOUNT_BLOCKED_MESSAGE =
  "Google blocked Gemini API access for this key. A new Cloud project under the same Google " +
  "account usually will not fix it — the restriction is often on the Google account itself. " +
  "Try: (1) a different Google account in AI Studio, (2) OpenAI or Anthropic BYOK here, or " +
  "(3) Dashboard → Settings → AI source → System to use EasySubmit credits without Gemini.";

export function isGeminiProjectDeniedMessage(message: string): boolean {
  return /denied access|project has been denied|google blocked gemini/i.test(message);
}
