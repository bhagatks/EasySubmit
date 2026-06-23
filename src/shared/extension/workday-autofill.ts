/**
 * Workday Phase C — autofill engine with Field Memory resolution.
 *
 * Uses the full 5-step resolution ladder from field-resolution.ts:
 *   server exact → server automationId → server semantic → vault → resume map
 *
 * Confidence gating: ≥0.85 auto-fill, 0.6–0.85 pre-fill+mark, <0.6 miss.
 * User-edit watchers attach after fill; batch-flush on Continue.
 * Emits FieldCapturePayload via CustomEvent for Cursor's capture API.
 */

import { pierceQuerySelector, pierceQuerySelectorAll } from "./shadow-dom";
import { vaultSet } from "./answer-vault";
import {
  type FieldDescriptor,
  type StoredAnswer,
  type FieldCapturePayload,
  FIELD_CAPTURE_MESSAGE,
  fieldSignature,
} from "./field-descriptor";
import {
  type WorkdayFillData,
  type ServerLookupMap,
  resolveStepFields,
} from "./field-resolution";
import { isDenylistedApplicationField } from "./field-denylist";
import type { ScrapedJobMetadata } from "./types";

export type { WorkdayFillData } from "./field-resolution";

// ── Public result ─────────────────────────────────────────────────────────────

export type WorkdayAutofillResult =
  | {
      ok: true;
      note: string;
      stepsFilled: number;
      fieldsFilled: number;
      reviewCount: number;
      missCount: number;
    }
  | { ok: false; error: string; manualFinish?: boolean };

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_STEPS = 12;
const STEP_SETTLE_MS = 1800;
const FILL_DELAY_MS = 80;
const REVIEW_DATA_ATTR = "data-es-review";

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

function cssEscape(s: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, "\\$&");
}

function setNativeValue(el: HTMLElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
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

function getOwnerLabel(el: Element): string {
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
  return el.getAttribute("placeholder") ?? el.getAttribute("name") ?? "";
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
    return Array.from(group.querySelectorAll("input[type='radio']")).map((r) => getOwnerLabel(r));
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
    STEP_HEADING_SELECTORS.map((s) => pierceQuerySelector(doc, s)?.textContent?.trim()).find(Boolean) ??
    "unknown";
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
    const label = getOwnerLabel(el);
    if (!label) continue;
    if (isDenylistedApplicationField(label)) continue;

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
        (el as HTMLInputElement).required || el.getAttribute("aria-required") === "true",
    });
  }

  return result;
}

// ── Single field filler ───────────────────────────────────────────────────────

async function fillField(doc: Document, descriptor: FieldDescriptor, value: string): Promise<boolean> {
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
          const lbl = getOwnerLabel(r).toLowerCase();
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

// ── User-edit watchers ────────────────────────────────────────────────────────

type EditWatchEntry = {
  descriptor: FieldDescriptor;
  autofillValue: string | null; // null = field was a miss, user types fresh
  currentValue: string;
};

function getElementValue(el: Element): string {
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") return el.checked ? "yes" : "no";
    if (el.type === "radio") return el.checked ? el.value : "";
  }
  if (el instanceof HTMLSelectElement) {
    return el.options[el.selectedIndex]?.textContent?.trim() ?? el.value;
  }
  return (el as HTMLInputElement).value ?? "";
}

function attachEditWatchers(
  doc: Document,
  descriptors: FieldDescriptor[],
  filledValues: Map<string, string>, // fieldSignature → autofill value
  watchMap: Map<string, EditWatchEntry>,
): void {
  for (const descriptor of descriptors) {
    if (descriptor.fieldType === "file") continue;

    const sel = descriptor.automationId
      ? `[data-automation-id="${cssEscape(descriptor.automationId)}"]`
      : `[aria-label="${cssEscape(descriptor.label)}"]`;

    const el = pierceQuerySelector(doc, sel);
    if (!el) continue;

    const sig = fieldSignature(descriptor);
    const autofillValue = filledValues.get(sig) ?? null;
    watchMap.set(sig, { descriptor, autofillValue, currentValue: getElementValue(el) });

    el.addEventListener("input", () => {
      const entry = watchMap.get(sig);
      if (entry) entry.currentValue = getElementValue(el);
    });
    el.addEventListener("change", () => {
      const entry = watchMap.get(sig);
      if (entry) entry.currentValue = getElementValue(el);
    });
  }
}

// ── Capture emit ──────────────────────────────────────────────────────────────

function buildAnswer(value: string, fieldType: FieldDescriptor["fieldType"]): StoredAnswer {
  if (fieldType === "checkbox" || fieldType === "radio") {
    return { kind: "boolean", value: value === "yes" || value === "true" };
  }
  if (fieldType === "select") {
    return { kind: "option", value, optionLabel: value };
  }
  return { kind: "text", value };
}

function buildCapturePayload(
  watchMap: Map<string, EditWatchEntry>,
  descriptors: FieldDescriptor[],
  tenantHost: string,
  stepFingerprint: string,
): FieldCapturePayload | null {
  const answers: FieldCapturePayload["answers"] = [];

  for (const descriptor of descriptors) {
    const sig = fieldSignature(descriptor);
    const entry = watchMap.get(sig);
    if (!entry || !entry.currentValue) continue;

    let source: FieldCapturePayload["answers"][number]["source"];
    if (entry.autofillValue === null) {
      source = "user";
    } else if (entry.currentValue !== entry.autofillValue) {
      source = "user_corrected";
    } else {
      source = "autofill_accepted";
    }

    answers.push({
      fieldSignature: sig,
      answer: buildAnswer(entry.currentValue, descriptor.fieldType),
      source,
    });

    // Mirror to local vault for offline use
    if (entry.currentValue && descriptor.fieldType !== "checkbox" && descriptor.fieldType !== "radio") {
      void vaultSet(descriptor.label, entry.currentValue);
    }
  }

  if (answers.length === 0) return null;

  return {
    type: FIELD_CAPTURE_MESSAGE,
    tenantHost,
    stepFingerprint,
    fields: descriptors,
    answers,
  };
}

async function emitCaptures(
  payload: FieldCapturePayload,
  onCapture?: (payload: FieldCapturePayload) => void | Promise<void>,
): Promise<void> {
  window.dispatchEvent(new CustomEvent(FIELD_CAPTURE_MESSAGE, { detail: payload }));
  if (onCapture) {
    await onCapture(payload);
  }
}

// ── Wizard helpers ────────────────────────────────────────────────────────────

function findContinueButton(doc: Document): HTMLElement | null {
  for (const sel of CONTINUE_SELECTORS) {
    const el = pierceQuerySelector(doc, sel);
    if (el instanceof HTMLElement && !el.hidden) return el;
  }
  return null;
}

function isOnReviewStep(doc: Document): boolean {
  return REVIEW_STEP_SELECTORS.some((sel) => pierceQuerySelector(doc, sel) instanceof HTMLElement);
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
  serverMap: ServerLookupMap = {},
  _meta?: ScrapedJobMetadata | null,
  onCapture?: (payload: FieldCapturePayload) => void | Promise<void>,
): Promise<WorkdayAutofillResult> {
  if (!/myworkdayjobs\.com/i.test(href)) {
    return { ok: false, error: "Autofill is only supported on Workday job pages right now.", manualFinish: true };
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
      return { ok: true, note: "Opened apply form — review fields and submit when ready.", stepsFilled: 0, fieldsFilled: 0, reviewCount: 0, missCount: 0 };
    }
  }

  let stepsFilled = 0;
  let totalFilled = 0;
  let totalReview = 0;
  let totalMiss = 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    if (isOnReviewStep(doc)) {
      const parts: string[] = [`Filled ${totalFilled} fields across ${stepsFilled} steps`];
      if (totalReview > 0) parts.push(`${totalReview} field${totalReview > 1 ? "s" : ""} to review`);
      return {
        ok: true,
        note: parts.join(" · ") + " — review and submit.",
        stepsFilled,
        fieldsFilled: totalFilled,
        reviewCount: totalReview,
        missCount: totalMiss,
      };
    }

    const continueBtn = findContinueButton(doc);
    if (!continueBtn) {
      return { ok: false, error: "Manual action required (CAPTCHA or attestation). Finish the application manually.", manualFinish: true };
    }

    const descriptors = discoverStepFields(doc, location.href);
    const resolvedMap = await resolveStepFields(descriptors, serverMap, fillData);

    const filledValues = new Map<string, string>();
    const watchMap = new Map<string, EditWatchEntry>();
    let stepFilled = 0;
    let stepReview = 0;
    let stepMiss = 0;

    for (const descriptor of descriptors) {
      const sig = fieldSignature(descriptor);
      const resolved = resolvedMap.get(sig);

      if (!resolved || resolved.gate === "miss") {
        stepMiss++;
        continue;
      }

      // Skip medium-confidence fields — pre-fill only if above review threshold
      if (resolved.gate === "review") {
        stepReview++;
        // Still fill, but mark for user review
        const filled = await fillField(doc, descriptor, resolved.value);
        if (filled) {
          filledValues.set(sig, resolved.value);
          // Mark the element for visual review hint
          const sel = descriptor.automationId
            ? `[data-automation-id="${cssEscape(descriptor.automationId)}"]`
            : null;
          if (sel) {
            const el = pierceQuerySelector(doc, sel);
            el?.setAttribute(REVIEW_DATA_ATTR, "true");
          }
        }
        continue;
      }

      // Auto-fill (confidence >= 0.85)
      const filled = await fillField(doc, descriptor, resolved.value);
      if (filled) {
        filledValues.set(sig, resolved.value);
        stepFilled++;
      }
    }

    // Attach edit watchers on all discovered fields
    attachEditWatchers(doc, descriptors, filledValues, watchMap);

    const tenantHost = new URL(location.href).hostname;
    const stepFingerprint = descriptors[0]?.stepFingerprint ?? "";

    // Persist captures before navigation (await so background POST completes)
    const capturePayload = buildCapturePayload(watchMap, descriptors, tenantHost, stepFingerprint);
    if (capturePayload) {
      await emitCaptures(capturePayload, onCapture);
    }

    continueBtn.click();
    await waitForDomSettle(doc, STEP_SETTLE_MS);

    totalFilled += stepFilled;
    totalReview += stepReview;
    totalMiss += stepMiss;
    stepsFilled++;
  }

  return {
    ok: false,
    error: "Reached step limit without finding the Review page. Finish manually.",
    manualFinish: true,
  };
}
