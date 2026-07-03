// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  failApplyPipelineLoader,
  isApplyPipelineLoaderRunning,
  startApplyPipelineLoader,
  stopApplyPipelineLoader,
  succeedApplyPipelineLoader,
} from "@/src/shared/extension/apply-pipeline-loader";

function makeSlot(): HTMLElement {
  const slot = document.createElement("div");
  document.body.appendChild(slot);
  return slot;
}

afterEach(() => {
  stopApplyPipelineLoader();
  document.body.replaceChildren();
});

describe("apply-pipeline-loader", () => {
  it("starts once and keeps running across slot re-mounts", () => {
    const slotA = makeSlot();
    startApplyPipelineLoader({ slot: slotA });
    expect(isApplyPipelineLoaderRunning()).toBe(true);
    const host = slotA.firstElementChild;
    expect(host).not.toBeNull();

    const slotB = makeSlot();
    slotA.remove();
    startApplyPipelineLoader({ slot: slotB });

    expect(isApplyPipelineLoaderRunning()).toBe(true);
    expect(slotB.firstElementChild).toBe(host);
  });

  it("dismisses on terminal success or failure", () => {
    const slot = makeSlot();
    startApplyPipelineLoader({ slot });
    expect(isApplyPipelineLoaderRunning()).toBe(true);

    succeedApplyPipelineLoader();
    expect(isApplyPipelineLoaderRunning()).toBe(false);
    expect(slot.childElementCount).toBe(0);

    startApplyPipelineLoader({ slot });
    failApplyPipelineLoader();
    expect(isApplyPipelineLoaderRunning()).toBe(false);
    expect(slot.childElementCount).toBe(0);
  });
});
