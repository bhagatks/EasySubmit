import {
  FIELD_CAPTURE_MESSAGE,
  type FieldCapturePayload,
} from "./field-descriptor";

export type FieldCaptureBridgeOptions = {
  getJobEntryId: () => string | undefined;
  onCapture: (payload: FieldCapturePayload, jobEntryId?: string) => void;
};

/**
 * Listens for Workday autofill {@link FIELD_CAPTURE_MESSAGE} CustomEvents
 * and forwards them to the extension background (API capture handler).
 */
export function setupFieldCaptureBridge(options: FieldCaptureBridgeOptions): void {
  window.addEventListener(FIELD_CAPTURE_MESSAGE, (event: Event) => {
    const detail = (event as CustomEvent<FieldCapturePayload>).detail;
    if (!detail || detail.type !== FIELD_CAPTURE_MESSAGE) return;
    if (!detail.fields?.length || !detail.answers?.length) return;

    const jobEntryId = options.getJobEntryId();
    options.onCapture(detail, jobEntryId);
  });
}
