export type SpaNavigationHandler = () => void;

/**
 * Detect SPA route changes (Workday, Greenhouse, etc.) that do not fire `popstate`.
 * Returns a cleanup function — only needed in tests.
 */
export function installSpaNavigationListeners(onNavigate: SpaNavigationHandler): () => void {
  const notify = (): void => {
    onNavigate();
  };

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = (...args: Parameters<History["pushState"]>) => {
    const result = originalPushState(...args);
    notify();
    return result;
  };

  history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    const result = originalReplaceState(...args);
    notify();
    return result;
  };

  window.addEventListener("popstate", notify);
  window.addEventListener("hashchange", notify);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) notify();
  });

  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener("popstate", notify);
    window.removeEventListener("hashchange", notify);
  };
}
