/** True when the tab is already on the EasySubmit dashboard shell. */
export function isAppDashboardUrl(tabUrl: string, appOrigin: string): boolean {
  try {
    const url = new URL(tabUrl);
    return appOriginsMatch(url.origin, appOrigin) && url.pathname.startsWith("/dashboard");
  } catch {
    return false;
  }
}

export function normalizeAppHost(hostname: string): string {
  const host = hostname.toLowerCase();
  if (host === "127.0.0.1") return "localhost";
  return host.startsWith("www.") ? host.slice(4) : host;
}

function defaultPort(protocol: string): string {
  return protocol === "https:" ? "443" : "80";
}

/** Treat localhost/127.0.0.1 and www/non-www as the same app host. */
export function appOriginsMatch(tabOrigin: string, appOrigin: string): boolean {
  try {
    const tab = new URL(tabOrigin);
    const app = new URL(appOrigin);
    if (tab.protocol !== app.protocol) return false;

    const tabPort = tab.port || defaultPort(tab.protocol);
    const appPort = app.port || defaultPort(app.protocol);
    if (tabPort !== appPort) return false;

    return normalizeAppHost(tab.hostname) === normalizeAppHost(app.hostname);
  } catch {
    return false;
  }
}

/** True when the tab belongs to the EasySubmit web app origin. */
export function isAppOriginUrl(tabUrl: string, appOrigin: string): boolean {
  try {
    return appOriginsMatch(new URL(tabUrl).origin, appOrigin);
  } catch {
    return false;
  }
}

export function expandAppOriginAliases(appOrigin: string): string[] {
  try {
    const url = new URL(appOrigin);
    const portSuffix = url.port ? `:${url.port}` : "";
    const aliases = new Set<string>([appOrigin]);

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      aliases.add(`${url.protocol}//localhost${portSuffix}`);
      aliases.add(`${url.protocol}//127.0.0.1${portSuffix}`);
    }

    const bareHost = normalizeAppHost(url.hostname);
    aliases.add(`${url.protocol}//${bareHost}${portSuffix}`);
    aliases.add(`${url.protocol}//www.${bareHost}${portSuffix}`);

    return [...aliases];
  } catch {
    return [appOrigin];
  }
}

export function buildDashboardUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export type AppTabCandidate = {
  id: number;
  url: string;
  windowId?: number;
};

/** Prefer an open dashboard tab, then any app tab on the same origin. */
export function pickAppTabToReuse(
  tabs: AppTabCandidate[],
  appOrigin: string,
): AppTabCandidate | undefined {
  const onOrigin = tabs.filter((tab) => isAppOriginUrl(tab.url, appOrigin));
  return (
    onOrigin.find((tab) => isAppDashboardUrl(tab.url, appOrigin)) ??
    onOrigin[0]
  );
}
