import { describe, expect, it, vi } from "vitest";
import {
  maxBodyScrollTop,
  restoreBodyScroll,
  scheduleRestoreBodyScroll,
} from "@/lib/extension/pipeline-debug-overlay-scroll";

function mockScrollBody(scrollHeight: number, clientHeight: number): HTMLElement {
  let scrollTop = 0;
  return {
    scrollHeight,
    clientHeight,
    get scrollTop() {
      return scrollTop;
    },
    set scrollTop(value: number) {
      scrollTop = value;
    },
  } as HTMLElement;
}

describe("pipeline debug overlay scroll", () => {
  it("clamps restored scroll position to scrollable range", () => {
    const body = mockScrollBody(400, 100);

    restoreBodyScroll(body, 999);
    expect(body.scrollTop).toBe(maxBodyScrollTop(body));
    expect(body.scrollTop).toBe(300);

    restoreBodyScroll(body, 120);
    expect(body.scrollTop).toBe(120);
  });

  it("scheduleRestoreBodyScroll applies the same target across frames", () => {
    const raf = vi
      .fn()
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
    vi.stubGlobal("requestAnimationFrame", raf);

    const body = mockScrollBody(400, 100);
    scheduleRestoreBodyScroll(body, 150);
    expect(body.scrollTop).toBe(150);
    expect(raf).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
