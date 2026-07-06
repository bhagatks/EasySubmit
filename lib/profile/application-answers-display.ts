import type { StoredAnswer } from "@/src/shared/extension/field-descriptor";

export function formatStoredAnswerDisplay(answer: StoredAnswer): string {
  switch (answer.kind) {
    case "text":
      return answer.value.trim() || "—";
    case "boolean":
      return answer.value ? "Yes" : "No";
    case "option":
      return (answer.optionLabel ?? answer.value).trim() || "—";
    case "file_ref":
      return answer.source === "tailored_resume"
        ? "Tailored resume (job-specific)"
        : "Profile resume";
    default: {
      const _exhaustive: never = answer;
      return String(_exhaustive);
    }
  }
}

export function parseStoredAnswerEdit(
  existing: StoredAnswer,
  rawValue: string,
): StoredAnswer | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  switch (existing.kind) {
    case "text":
      return { kind: "text", value: trimmed };
    case "boolean": {
      const normalized = trimmed.toLowerCase();
      if (normalized === "yes" || normalized === "true") {
        return { kind: "boolean", value: true };
      }
      if (normalized === "no" || normalized === "false") {
        return { kind: "boolean", value: false };
      }
      return null;
    }
    case "option":
      return {
        kind: "option",
        value: trimmed,
        optionLabel: trimmed,
      };
    case "file_ref":
      return null;
    default: {
      const _exhaustive: never = existing;
      return _exhaustive;
    }
  }
}

export function storedAnswerIsEditable(answer: StoredAnswer): boolean {
  return answer.kind !== "file_ref";
}
