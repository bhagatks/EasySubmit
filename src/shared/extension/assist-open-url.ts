export const ASSIST_OPEN_QUERY_PARAM = "es_open";
export const ASSIST_OPEN_QUERY_VALUE = "assist";

/** Append dashboard → extension deep-link flag without dropping existing query params. */
export function appendAssistOpenParam(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set(ASSIST_OPEN_QUERY_PARAM, ASSIST_OPEN_QUERY_VALUE);
    return url.toString();
  } catch {
    const separator = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${separator}${ASSIST_OPEN_QUERY_PARAM}=${ASSIST_OPEN_QUERY_VALUE}`;
  }
}

export function hasAssistOpenParam(href: string): boolean {
  try {
    return new URL(href).searchParams.get(ASSIST_OPEN_QUERY_PARAM) === ASSIST_OPEN_QUERY_VALUE;
  } catch {
    return href.includes(`${ASSIST_OPEN_QUERY_PARAM}=${ASSIST_OPEN_QUERY_VALUE}`);
  }
}

export function stripAssistOpenParam(href: string): string {
  try {
    const url = new URL(href);
    url.searchParams.delete(ASSIST_OPEN_QUERY_PARAM);
    const normalized = url.toString().replace(/\/$/, "");
    return normalized || href;
  } catch {
    return href;
  }
}
