import { describe, expect, it } from "vitest";
import {
  ENHANCE_PROGRESS_CANCEL_LABEL,
  ENHANCE_PROGRESS_CAPTION,
  renderEnhanceProgressOverlay,
} from "@/src/shared/extension/enhance-progress-overlay";
import {
  EASYSUBMIT_BRAND_CANVAS_COLORS,
  triggerEasySubmitAnimation,
} from "@/src/shared/extension/easysubmit-brand-canvas-animation";

describe("renderEnhanceProgressOverlay", () => {
  it("renders canvas brand animation container and status subtext", () => {
    const html = renderEnhanceProgressOverlay();

    expect(html).toContain('class="easysubmit-animation-box"');
    expect(html).toContain('class="es-enhance-wordmark"');
    expect(html).toContain("EasySubmit");
    expect(html).toContain('id="brand-canvas"');
    expect(html).toContain('id="status-subtext"');
    expect(html).toContain(ENHANCE_PROGRESS_CAPTION);
    expect(html).toContain('data-document-enhance-cancel="1"');
    expect(html).toContain(ENHANCE_PROGRESS_CANCEL_LABEL);
  });
});

describe("triggerEasySubmitAnimation", () => {
  it("returns null when canvas container is missing", () => {
    expect(triggerEasySubmitAnimation()).toBeNull();
  });

  it("exports brand canvas palette tokens", () => {
    expect(EASYSUBMIT_BRAND_CANVAS_COLORS.surface).toBe("#FFFFFF");
    expect(EASYSUBMIT_BRAND_CANVAS_COLORS.primary).toBe("#6366F1");
    expect(EASYSUBMIT_BRAND_CANVAS_COLORS.text).toBe("#1F2937");
  });
});
