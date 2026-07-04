import { findWorkdayApplyButton } from "./workday-helpers";

export type WorkdayAutofillStubResult =
  | { ok: true; note: string }
  | { ok: false; error: string; manualFinish?: boolean };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Phase C scaffold — prepares the Workday apply flow without filling fields yet.
 * Real field mapping replaces this module once `src/apply/` is ported.
 */
export async function runWorkdayAutofillStub(
  doc: Document,
  href: string,
): Promise<WorkdayAutofillStubResult> {
  if (!/myworkday(?:jobs|site)\.com/i.test(href)) {
    return {
      ok: false,
      error: "Autofill is only supported on Workday job pages right now.",
      manualFinish: true,
    };
  }

  const applyButton = findWorkdayApplyButton(doc);
  if (applyButton instanceof HTMLElement) {
    applyButton.click();
    await delay(600);
    return {
      ok: true,
      note: "Opened the Workday apply form — review fields and submit when ready.",
    };
  }

  await delay(400);
  return {
    ok: true,
    note: "Resume is ready — open the apply form on Workday and submit when ready.",
  };
}
