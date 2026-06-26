/** Pages where the extension must not patch page-world fetch/XHR or show the job card. */
export function isEasySubmitManagedAppPage(
  hostname: string = typeof location !== "undefined" ? location.hostname : "",
  pathname: string = typeof location !== "undefined" ? location.pathname : "",
): boolean {
  const host = hostname.toLowerCase();
  const onAppHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "easysubmit.ai" ||
    host.endsWith(".easysubmit.ai");

  if (!onAppHost) return false;

  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname === "/login" ||
    (pathname.startsWith("/extension") && !pathname.startsWith("/extension/bridge"))
  );
}
