export type ExtensionInstallPromptTriggerContext = {
  extensionConnected: boolean | null;
  onPromptExemptPage: boolean;
  byokOpen: boolean;
  sessionDismissed: boolean;
  setupFlowActive: boolean;
  isSetupEntry: boolean;
  setupHandled: boolean;
};

/** Shared gate — each enabled trigger (OR) may open the modal when this passes. */
export function isExtensionPromptOpenBlocked(
  ctx: ExtensionInstallPromptTriggerContext,
): boolean {
  if (ctx.onPromptExemptPage || ctx.byokOpen) return true;
  if (ctx.sessionDismissed && !ctx.setupFlowActive) return true;
  return false;
}

export function shouldOpenOnDashboardVisit(
  ctx: ExtensionInstallPromptTriggerContext & { dashboardVisit: boolean },
): boolean {
  if (ctx.setupFlowActive) return false;
  if (!ctx.dashboardVisit) return false;
  if (ctx.extensionConnected !== false) return false;
  if (ctx.isSetupEntry && !ctx.setupHandled) return false;
  return !isExtensionPromptOpenBlocked(ctx);
}

export function shouldOpenOnTabFocus(
  ctx: ExtensionInstallPromptTriggerContext & { tabFocusReturn: boolean },
): boolean {
  if (ctx.setupFlowActive) return false;
  if (!ctx.tabFocusReturn) return false;
  if (ctx.extensionConnected !== false) return false;
  return !isExtensionPromptOpenBlocked(ctx);
}

export function shouldOpenOnPeriodicRefresh(
  ctx: ExtensionInstallPromptTriggerContext & { periodicRefresh: boolean },
): boolean {
  if (ctx.setupFlowActive) return false;
  if (!ctx.periodicRefresh) return false;
  if (ctx.extensionConnected !== false) return false;
  return !isExtensionPromptOpenBlocked(ctx);
}

/** Post-onboarding setup flow (`?setup=1`) — not gated by dashboardVisit. */
export function shouldOpenOnSetupFlow(ctx: ExtensionInstallPromptTriggerContext): boolean {
  if (!ctx.setupFlowActive) return false;
  if (ctx.extensionConnected !== false) return false;
  return !isExtensionPromptOpenBlocked(ctx);
}
