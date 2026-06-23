/**
 * Workday Phase C — real autofill engine.
 *
 * Replaces workday-autofill-stub.ts. Fills a Workday apply wizard using
 * shadow DOM traversal, React synthetic events, and answer-vault for interim
 * local field memory. Emits FieldDescriptor-shaped captures via postMessage
 * so Cursor's POST /api/extension/application-answers/capture can plug in
 * without changes to this module (see field-descriptor.ts).
 *
 * Does NOT add Prisma tables — that is cursor/field-memory branch.
 */

import { pierceQuerySelector, pierceQuerySelectorAll } from "./shadow-dom";
import { vaultGet as _vaultGet, vaultSet, vaultGetMany } from "./answer-vault";
import {
  type FieldDescriptor,
  type StoredAnswer,
  type FieldCapturePayload,
  FIELD_CAPTURE_MESSAGE,
  fieldSignature,
} from "./field-descriptor";
import type { ScrapedJobMetadata } from "./types";

// Re-export so content script only needs one import
export type { FieldDescriptor };

// ── Public result type ────────────────────────────────────────────────────────

export type WorkdayAutofillResult =
  | { ok: true; note: string; stepsFilled: number; fieldsFilled: number }
  | { ok: false; error: string; manualFinish?: boolean };

/** Resume fields the caller passes in — fetched from /api/extension/jobs/:id/fill-data */
export type WorkdayFillData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState?: string | null;
  linkedIn?: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const DENYLIST = /social.?security|ssn|\bsin\b|tax.?id|bank.?account|password|credit.?card/i;
const MAX_STEPS = 12;
const STEP_SETTLE_MS = 1800;
const FILL_DELAY_MS = 80;

const CONTINUE_SELECTORS = [
  "[data-automation-id='bottomNavigationNextButton']",
  "[data-automation-id='nextButton']",
  "[data-automation-id='continueButton']",
];

const REVIEW_STEP_SELECTORS = [
  "[data-automation-id='reviewApplication']",
  "[data-automation-id='bottomNavigationSubmitButton']",
  "[data-automation-id='submit']",
];

const STEP_HEADING_SELECTORS = [
  "[data-automation-id='stepHeader']",
  "[data-automation-id='currentStep']",
  "h2[data-automation-id]",
];

// ── React synthetic event firing ─────────────────────────────────────────────

function setNativeValue(el: HTMLElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  if (descriptor?.set) {
    descriptor.set.call(el, value);
  } else {
    (el as HTMLInputElement).value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

function triggerSelectChange(el: HTMLSelectElement, value: string): boolean {
  const option = Array.from(el.options).find(
    (o) => o.value === value || o.textContent?.trim().toLowerCase() === value.toLowerCase(),
  );
  if (!option) return false;
  el.value = option.value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
}

function clickInput(el: HTMLInputElement): void {
  el.click();
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ── Field discovery ───────────────────────────────────────────────────────────

function cssEscape(s: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, "\\$&");
}

function getLabel(el: Element): string {
  const ownerDoc = el.ownerDocument ?? document;
  const id = el.id;
  if (id) {
    const lbl = ownerDoc.querySelector(`label[for="${cssEscape(id)}"]`);
    if (lbl) return lbl.textContent?.trim() ?? "";
  }
  const ariaLabelledBy = el.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const ref = ownerDoc.getElementById(ariaLabelledBy);
    if (ref) return ref.textContent?.trim() ?? "";
  }
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  const closestAid = el.closest("[data-automation-id]");
  if (closestAid) {
    const inner = closestAid.querySelector("[data-automation-id$='Label'], label");
    if (inner) return inner.textContent?.trim() ?? "";
  }
  return (
    el.getAttribute("placeholder") ??
    el.getAttribute("name") ??
    ""
  );
}

function getFieldType(el: Element): FieldDescriptor["fieldType"] {
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return "textarea";
  if (tag === "select") return "select";
  if (tag === "input") {
    const t = (el as HTMLInputElement).type?.toLowerCase();
    if (t === "radio") return "radio";
    if (t === "checkbox") return "checkbox";
    if (t === "file") return "file";
  }
  return "text";
}

function getOptions(el: Element): string[] | undefined {
  if (el.tagName.toLowerCase() === "select") {
    return Array.from((el as HTMLSelectElement).options).map(
      (o) => o.textContent?.trim() ?? o.value,
    );
  }
  const group = el.closest("[role='radiogroup'], [role='group']");
  if (group) {
    return Array.from(group.querySelectorAll("input[type='radio']")).map((r) => getLabel(r));
  }
  return undefined;
}

function buildStepFingerprint(url: string, heading: string): string {
  const seg = new URL(url).pathname.split("/").slice(-2).join("/");
  return `${seg}__${heading.toLowerCase().replace(/\s+/g, "_").slice(0, 40)}`;
}

export function discoverStepFields(doc: Document, url: string): FieldDescriptor[] {
  const tenantHost = new URL(url).hostname;
  const heading =
    STEP_HEADING_SELECTORS
      .map((s) => pierceQuerySelector(doc, s)?.textContent?.trim())
      .find(Boolean) ?? "unknown";
  const stepFingerprint = buildStepFingerprint(url, heading);

  const elements = pierceQuerySelectorAll(doc, "input, textarea, select").filter(
    (el): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
      const type = (el as HTMLInputElement).type?.toLowerCase();
      if (["hidden", "submit", "button", "image", "reset"].includes(type)) return false;
      if ((el as HTMLInputElement).disabled) return false;
      return true;
    },
  );

  const seen = new Set<string>();
  const result: FieldDescriptor[] = [];

  for (const el of elements) {
    const label = getLabel(el);
    if (!label) continue;
    if (DENYLIST.test(label)) continue;

    const automationId =
      el.getAttribute("data-automation-id") ??
      el.closest("[data-automation-id]")?.getAttribute("data-automation-id") ??
      null;

    const fieldType = getFieldType(el);
    const dedupeKey = `${automationId ?? label}__${fieldType}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    result.push({
      platform: "workday",
      tenantHost,
      stepFingerprint,
      automationId,
      label,
      fieldType,
      options: getOptions(el),
      required:
        (el as HTMLInputElement).required ||
        el.getAttribute("aria-required") === "true",
    });
  }

  return result;
}

// ── Resume → field resolution ─────────────────────────────────────────────────

function resolveFromResume(label: string, data: WorkdayFillData): string | null {
  const l = label.toLowerCase();
  if (/first\s*name|given\s*name/.test(l)) return data.firstName || null;
  if (/last\s*name|family\s*name|surname/.test(l)) return data.lastName || null;
  if (/\bemail\b|e-mail/.test(l)) return data.email || null;
  if (/\bphone\b|\bmobile\b|\bcell\b/.test(l)) return data.phone || null;
  if (/\bcity\b|\blocation\b|address/.test(l) && data.cityState) return data.cityState;
  if (/linkedin/.test(l) && data.linkedIn) return data.linkedIn;
  return null;
}

// ── Single field filler ───────────────────────────────────────────────────────

async function fillField(
  doc: Document,
  descriptor: FieldDescriptor,
  value: string,
): Promise<boolean> {
  await new Promise((r) => setTimeout(r, FILL_DELAY_MS));

  const sel = descriptor.automationId
    ? `[data-automation-id="${cssEscape(descriptor.automationId)}"]`
    : `[aria-label="${cssEscape(descriptor.label)}"]`;

  const el = pierceQuerySelector(doc, sel);
  if (!el) return false;

  try {
    switch (descriptor.fieldType) {
      case "text":
      case "textarea":
        setNativeValue(el as HTMLInputElement, value);
        return true;

      case "select":
        return triggerSelectChange(el as HTMLSelectElement, value);

      case "radio": {
        const group = el.closest("[role='radiogroup'], [role='group']") ?? doc;
        const radios = pierceQuerySelectorAll(group as Element, "input[type='radio']");
        const match = radios.find((r) => {
          const lbl = getLabel(r).toLowerCase();
          return lbl === value.toLowerCase() || lbl.startsWith(value.toLowerCase().slice(0, 3));
        });
        if (match) { clickInput(match as HTMLInputElement); return true; }
        return false;
      }

      case "checkbox": {
        const cb = el as HTMLInputElement;
        const want = value.toLowerCase() === "yes" || value === "true" || value === "1";
        if (cb.checked !== want) clickInput(cb);
        return true;
      }

      default:
        return false;
    }
  } catch {
    return false;
  }
}

// ── postMessage emit (Cursor plugs in the API handler later) ──────────────────

function emitCaptures(payload: Omit<FieldCapturePayload, "type">): void {
  if (payload.answers.length === 0) return;
  window.dispatchEvent(
    new CustomEvent(FIELD_CAPTURE_MESSAGE, {
      detail: { type: FIELD_CAPTURE_MESSAGE, ...payload } satisfies FieldCapturePayload,
    }),
  );
}

// ── Wizard navigation helpers ─────────────────────────────────────────────────

function findContinueButton(doc: Document): HTMLElement | null {
  for (const sel of CONTINUE_SELECTORS) {
    const el = pierceQuerySelector(doc, sel);
    if (el instanceof HTMLElement && !el.hidden) return el;
  }
  return null;
}

function isOnReviewStep(doc: Document): boolean {
  return REVIEW_STEP_SELECTORS.some(
    (sel) => pierceQuerySelector(doc, sel) instanceof HTMLElement,
  );
}

function waitForDomSettle(doc: Document, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      observer.disconnect();
      setTimeout(resolve, 400);
    });
    observer.observe(doc.body ?? doc.documentElement, { childList: true, subtree: true });
  });
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runWorkdayAutofill(
  doc: Document,
  href: string,
  fillData: WorkdayFillData,
  _meta?: ScrapedJobMetadata | null,
): Promise<WorkdayAutofillResult> {
  if (!/myworkdayjobs\.com/i.test(href)) {
    return {
      ok: false,
      error: "Autofill is only supported on Workday job pages right now.",
      manualFinish: true,
    };
  }

  // On posting page: click Apply first
  const applyBtn = pierceQuerySelector(
    doc,
    "[data-automation-id='applyButton'], [data-automation-id='adventureButton']",
  );
  if (applyBtn instanceof HTMLElement) {
    applyBtn.click();
    await waitForDomSettle(doc, STEP_SETTLE_MS);
    if (!findContinueButton(doc) && !isOnReviewStep(doc)) {
      return {
        ok: true,
        note: "Opened apply form — review fields and submit when ready.",
        stepsFilled: 0,
        fieldsFilled: 0,
      };
    }
  }

  let stepsFilled = 0;
  let totalFieldsFilled = 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    if (isOnReviewStep(doc)) {
      return {
        ok: true,
        note: `Filled ${totalFieldsFilled} fields across ${stepsFilled} steps — review and submit.`,
        stepsFilled,
        fieldsFilled: totalFieldsFilled,
      };
    }

    const continueBtn = findContinueButton(doc);
    if (!continueBtn) {
      return {
        ok: false,
        error: "Manual action required (CAPTCHA or attestation). Finish the application manually.",
        manualFinish: true,
      };
    }

    const descriptors = discoverStepFields(doc, location.href);
    const labels = descriptors.map((d) => d.label);
    const vaultAnswers = await vaultGetMany(labels);

    const stepAnswers: FieldCapturePayload["answers"] = [];
    let stepCount = 0;

    for (const descriptor of descriptors) {
      if (descriptor.fieldType === "file") continue;

      // Resolution ladder: vault → resume map
      const fromVault = vaultAnswers[descriptor.label] ?? null;
      const fromResume = resolveFromResume(descriptor.label, fillData);
      const value = fromVault ?? fromResume;
      if (!value) continue;

      const filled = await fillField(doc, descriptor, value);
      if (!filled) continue;

      stepCount++;
      const sig = fieldSignature(descriptor);
      const answer: StoredAnswer =
        descriptor.fieldType === "checkbox" || descriptor.fieldType === "radio"
          ? { kind: "boolean", value: value.toLowerCase() === "yes" || value === "true" }
          : descriptor.fieldType === "select"
            ? { kind: "option", value, optionLabel: value }
            : { kind: "text", value };

      stepAnswers.push({
        fieldSignature: sig,
        answer,
        source: fromVault ? "autofill_accepted" : "autofill_accepted",
      });

      // Write back to local vault for cross-session memory
      if (answer.kind === "text") {
        void vaultSet(descriptor.label, value);
      }
    }

    emitCaptures({
      tenantHost: new URL(location.href).hostname,
      stepFingerprint: descriptors[0]?.stepFingerprint ?? "",
      fields: descriptors,
      answers: stepAnswers,
    });

    totalFieldsFilled += stepCount;
    stepsFilled++;

    continueBtn.click();
    await waitForDomSettle(doc, STEP_SETTLE_MS);
  }

  return {
    ok: false,
    error: "Reached step limit without finding the Review page. Finish manually.",
    manualFinish: true,
  };
}
