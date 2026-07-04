import { discoverStepFields } from "./workday-autofill";

export type AssistFieldSuggestion = {
  label: string;
  hint: string;
  warning?: boolean;
};

function genericFieldSuggestions(doc: Document, limit = 6): AssistFieldSuggestion[] {
  const suggestions: AssistFieldSuggestion[] = [];
  const inputs = doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select",
  );

  for (const input of inputs) {
    if (suggestions.length >= limit) break;
    if (input.offsetParent === null) continue;

    const id = input.id;
    const labelledBy = input.getAttribute("aria-labelledby");
    let label =
      (id ? doc.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent : null) ||
      (labelledBy ? doc.getElementById(labelledBy)?.textContent : null) ||
      input.getAttribute("aria-label") ||
      input.getAttribute("placeholder") ||
      input.name ||
      "Field";

    label = label.trim().replace(/\s+/g, " ");
    if (!label || label.length < 2) continue;

    suggestions.push({
      label: label.slice(0, 80),
      hint: input.value?.trim() ? "Has value on page" : "Ready to assist",
    });
  }

  return suggestions;
}

/** V1 assist card — label-only suggestions (no AI). */
export function buildAssistFieldSuggestions(
  doc: Document,
  url: string,
  options?: { uploadWarnings?: string[] },
): AssistFieldSuggestion[] {
  const uploadWarnings = new Set(
    (options?.uploadWarnings ?? []).map((label) => label.trim().toLowerCase()),
  );

  const withWarnings = (items: AssistFieldSuggestion[]): AssistFieldSuggestion[] =>
    items.map((item) => ({
      ...item,
      warning: uploadWarnings.has(item.label.trim().toLowerCase()),
      hint: uploadWarnings.has(item.label.trim().toLowerCase())
        ? "Upload blocked — attach manually"
        : item.hint,
    }));

  if (/myworkday(?:jobs|site)\.com/i.test(url)) {
    return withWarnings(
      discoverStepFields(doc, url)
        .slice(0, 8)
        .map((field) => ({
          label: field.label.trim() || field.automationId || "Field",
          hint: "Workday field detected",
        })),
    );
  }

  return withWarnings(genericFieldSuggestions(doc));
}
