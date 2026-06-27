import { describe, expect, it } from "vitest";
import {
  isExtensionPromptOpenBlocked,
  shouldOpenOnDashboardVisit,
  shouldOpenOnPeriodicRefresh,
  shouldOpenOnSetupFlow,
  shouldOpenOnTabFocus,
  type ExtensionInstallPromptTriggerContext,
} from "@/lib/dashboard/extension-install-prompt-triggers";

const disconnected: ExtensionInstallPromptTriggerContext = {
  extensionConnected: false,
  onPromptExemptPage: false,
  byokOpen: false,
  sessionDismissed: false,
  setupFlowActive: false,
  isSetupEntry: false,
  setupHandled: false,
};

describe("extension-install-prompt-triggers", () => {
  it("blocks when exempt page, BYOK open, or session dismissed (non-setup)", () => {
    expect(isExtensionPromptOpenBlocked({ ...disconnected, onPromptExemptPage: true })).toBe(true);
    expect(isExtensionPromptOpenBlocked({ ...disconnected, byokOpen: true })).toBe(true);
    expect(isExtensionPromptOpenBlocked({ ...disconnected, sessionDismissed: true })).toBe(true);
    expect(
      isExtensionPromptOpenBlocked({
        ...disconnected,
        sessionDismissed: true,
        setupFlowActive: true,
      }),
    ).toBe(false);
  });

  it("dashboardVisit opens only when flag enabled and disconnected", () => {
    expect(shouldOpenOnDashboardVisit({ ...disconnected, dashboardVisit: false })).toBe(false);
    expect(shouldOpenOnDashboardVisit({ ...disconnected, dashboardVisit: true })).toBe(true);
    expect(
      shouldOpenOnDashboardVisit({
        ...disconnected,
        dashboardVisit: true,
        extensionConnected: true,
      }),
    ).toBe(false);
    expect(
      shouldOpenOnDashboardVisit({
        ...disconnected,
        dashboardVisit: true,
        isSetupEntry: true,
        setupHandled: false,
      }),
    ).toBe(false);
  });

  it("tabFocusReturn opens only when flag enabled and disconnected", () => {
    expect(shouldOpenOnTabFocus({ ...disconnected, tabFocusReturn: false })).toBe(false);
    expect(shouldOpenOnTabFocus({ ...disconnected, tabFocusReturn: true })).toBe(true);
    expect(
      shouldOpenOnTabFocus({
        ...disconnected,
        tabFocusReturn: true,
        sessionDismissed: true,
      }),
    ).toBe(false);
  });

  it("periodicRefresh opens only when flag enabled and disconnected", () => {
    expect(shouldOpenOnPeriodicRefresh({ ...disconnected, periodicRefresh: false })).toBe(false);
    expect(shouldOpenOnPeriodicRefresh({ ...disconnected, periodicRefresh: true })).toBe(true);
    expect(
      shouldOpenOnPeriodicRefresh({
        ...disconnected,
        periodicRefresh: true,
        sessionDismissed: true,
      }),
    ).toBe(false);
  });

  it("return-visit triggers are suppressed during setup flow", () => {
    const inSetup = { ...disconnected, setupFlowActive: true };
    expect(shouldOpenOnDashboardVisit({ ...inSetup, dashboardVisit: true })).toBe(false);
    expect(shouldOpenOnTabFocus({ ...inSetup, tabFocusReturn: true })).toBe(false);
    expect(shouldOpenOnPeriodicRefresh({ ...inSetup, periodicRefresh: true })).toBe(false);
  });

  it("session dismiss blocks return-visit triggers but not setup flow", () => {
    const dismissed = { ...disconnected, sessionDismissed: true };
    expect(shouldOpenOnDashboardVisit({ ...dismissed, dashboardVisit: true })).toBe(false);
    expect(shouldOpenOnTabFocus({ ...dismissed, tabFocusReturn: true })).toBe(false);
    expect(shouldOpenOnPeriodicRefresh({ ...dismissed, periodicRefresh: true })).toBe(false);
    expect(
      shouldOpenOnSetupFlow({ ...dismissed, setupFlowActive: true, sessionDismissed: true }),
    ).toBe(true);
  });

  it("setup flow opens regardless of dashboardVisit", () => {
    expect(shouldOpenOnSetupFlow({ ...disconnected, setupFlowActive: true })).toBe(true);
    expect(
      shouldOpenOnSetupFlow({
        ...disconnected,
        setupFlowActive: true,
        extensionConnected: true,
      }),
    ).toBe(false);
  });
});
