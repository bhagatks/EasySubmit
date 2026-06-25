/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { installSpaNavigationListeners } from "@/src/shared/extension/spa-navigation";

describe("installSpaNavigationListeners", () => {
  it("fires on history.pushState", () => {
    const onNavigate = vi.fn();
    const cleanup = installSpaNavigationListeners(onNavigate);

    history.pushState({}, "", "/details/test-job_R-123");

    expect(onNavigate).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("fires on history.replaceState", () => {
    const onNavigate = vi.fn();
    const cleanup = installSpaNavigationListeners(onNavigate);

    history.replaceState({}, "", "/details/another-job_R-456");

    expect(onNavigate).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
