export type UploadDocumentKind = "resume" | "cover_letter";

export function buildPdfFile(bytes: ArrayBuffer | Uint8Array, filename: string): File {
  const normalized = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes);
  return new File([normalized], filename, { type: "application/pdf" });
}

export function isResumeUploadLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  if (/cover letter|motivation letter|letter of interest/.test(normalized)) return false;
  return /resume|curriculum vitae|\bcv\b/.test(normalized);
}

export function isCoverLetterUploadLabel(label: string): boolean {
  return /cover letter|motivation letter|letter of interest/.test(label.trim().toLowerCase());
}

export function resolveUploadDocumentKind(label: string): UploadDocumentKind | null {
  if (isCoverLetterUploadLabel(label)) return "cover_letter";
  if (isResumeUploadLabel(label)) return "resume";
  return null;
}

/** Standard `<input type="file">` injection via DataTransfer. */
export async function injectFileIntoInput(
  input: HTMLInputElement,
  bytes: ArrayBuffer,
  filename: string,
): Promise<boolean> {
  if (input.type !== "file") return false;

  try {
    const file = buildPdfFile(bytes, filename);
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return input.files?.length === 1;
  } catch {
    return false;
  }
}

/** Workday drop zones — dragenter/dragover/drop simulation. */
export function injectFileViaDragDrop(target: Element, bytes: ArrayBuffer, filename: string): boolean {
  try {
    const file = buildPdfFile(bytes, filename);
    const transfer = new DataTransfer();
    transfer.items.add(file);

    const init: DragEventInit = {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    };

    target.dispatchEvent(new DragEvent("dragenter", init));
    target.dispatchEvent(new DragEvent("dragover", init));
    target.dispatchEvent(new DragEvent("drop", init));
    return true;
  } catch {
    return false;
  }
}

export function findFileInputForDescriptor(
  root: ParentNode,
  automationId: string | null,
  label: string,
): HTMLInputElement | null {
  if (automationId) {
    const byAutomation = root.querySelector(
      `[data-automation-id="${cssEscapeAttr(automationId)}"] input[type="file"], input[type="file"][data-automation-id="${cssEscapeAttr(automationId)}"]`,
    );
    if (byAutomation instanceof HTMLInputElement) return byAutomation;
  }

  const inputs = root.querySelectorAll("input[type='file']");
  for (const candidate of inputs) {
    if (!(candidate instanceof HTMLInputElement)) continue;
    const aria = candidate.getAttribute("aria-label")?.trim();
    if (aria && aria.toLowerCase() === label.trim().toLowerCase()) return candidate;
  }

  return null;
}

export function findWorkdayDropTarget(root: ParentNode, label: string): Element | null {
  const normalized = label.trim().toLowerCase();
  const candidates = root.querySelectorAll(
    "[data-automation-id*='file'], [data-automation-id*='upload'], [data-automation-id*='drop']",
  );

  for (const candidate of candidates) {
    const aria = candidate.getAttribute("aria-label")?.trim().toLowerCase();
    if (aria && (aria.includes(normalized) || normalized.includes(aria))) {
      return candidate;
    }
  }

  return findFileInputForDescriptor(root, null, label);
}

export async function injectPdfDocument(
  root: ParentNode,
  input: {
    label: string;
    automationId?: string | null;
    platform?: string;
    bytes: ArrayBuffer | Uint8Array;
    filename: string;
  },
): Promise<boolean> {
  const buffer =
    input.bytes instanceof ArrayBuffer
      ? input.bytes
      : new Uint8Array(input.bytes).buffer;

  const fileInput = findFileInputForDescriptor(root, input.automationId ?? null, input.label);
  if (fileInput && (await injectFileIntoInput(fileInput, buffer, input.filename))) {
    return true;
  }

  if (input.platform === "workday") {
    const dropTarget = findWorkdayDropTarget(root, input.label);
    if (dropTarget && injectFileViaDragDrop(dropTarget, buffer, input.filename)) {
      return true;
    }
  }

  return false;
}

function cssEscapeAttr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
