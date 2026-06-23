/**
 * Shared FieldDescriptor + StoredAnswer types.
 *
 * Claude emits these from workday-autofill.ts via postMessage.
 * Cursor imports them for POST /api/extension/application-answers/capture
 * on the cursor/field-memory branch — no changes needed to this file.
 *
 * Shape matches APPLICATION_FIELD_MEMORY.md spec exactly.
 */

export type FieldDescriptor = {
  platform: "workday" | "greenhouse" | "lever" | "ashby" | "smartrecruiters";
  tenantHost: string;
  stepFingerprint: string;
  automationId: string | null;
  label: string;
  fieldType: "text" | "textarea" | "select" | "radio" | "checkbox" | "file";
  options?: string[];
  required: boolean;
};

export type StoredAnswer =
  | { kind: "text"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "option"; value: string; optionLabel?: string }
  | { kind: "file_ref"; source: "tailored_resume"; jobEntryId: string }
  | { kind: "file_ref"; source: "profile_resume"; profileId: string };

/** postMessage type constant — Cursor listens for this. */
export const FIELD_CAPTURE_MESSAGE = "__easysubmit_field_capture__" as const;

/** Payload shape for the postMessage capture event. */
export type FieldCapturePayload = {
  type: typeof FIELD_CAPTURE_MESSAGE;
  tenantHost: string;
  stepFingerprint: string;
  fields: FieldDescriptor[];
  answers: Array<{
    fieldSignature: string;
    answer: StoredAnswer;
    source: "user" | "autofill_accepted" | "user_corrected";
  }>;
};

/** Options-set fingerprint used inside {@link fieldSignature}. */
export function optionsFingerprint(options: string[] | undefined): string | null {
  if (!options?.length) return null;
  return simpleHash(options.join("|"));
}

/** Compute a stable fieldSignature matching APPLICATION_FIELD_MEMORY.md. */
export function fieldSignature(d: FieldDescriptor): string {
  const optionsHash = d.options?.length ? simpleHash(d.options.join("|")) : "";
  return simpleHash(
    [d.platform, d.tenantHost, d.automationId ?? "", normalizeLabel(d.label), d.fieldType, optionsHash].join("::"),
  );
}

/** Compute a cross-employer semanticKey. */
export function semanticKey(d: FieldDescriptor): string {
  return simpleHash(
    [d.platform, normalizeLabel(d.label), d.fieldType].join("::"),
  );
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function simpleHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
