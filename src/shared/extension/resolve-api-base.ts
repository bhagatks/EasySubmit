import { isLocalApiBase } from "@/src/shared/extension/open-dashboard";

export type ResolveExtensionApiBaseInput = {
  /** Inlined at build time from NEXT_PUBLIC_APP_URL. */
  buildDefault: string;
  storedApiBaseUrl: string | null;
  openTabOrigin: string | null;
};

export function shouldClearStaleLocalApiBasePin(
  buildDefault: string,
  storedApiBaseUrl: string | null,
): boolean {
  const prodPackage = !isLocalApiBase(buildDefault);
  const stored = storedApiBaseUrl?.trim().replace(/\/$/, "") ?? "";
  return prodPackage && Boolean(stored) && isLocalApiBase(stored);
}

/** Resolve which EasySubmit web origin the extension should use. */
export function resolveExtensionApiBase(input: ResolveExtensionApiBaseInput): string {
  const buildDefault = input.buildDefault.trim().replace(/\/$/, "");
  const prodPackage = !isLocalApiBase(buildDefault);

  let stored = input.storedApiBaseUrl?.trim().replace(/\/$/, "") ?? null;
  if (prodPackage && stored && isLocalApiBase(stored)) {
    stored = null;
  }

  if (prodPackage) {
    if (stored?.startsWith("http")) {
      return stored;
    }
    return buildDefault;
  }

  if (stored?.startsWith("http")) {
    return stored;
  }

  let tabOrigin = input.openTabOrigin?.trim().replace(/\/$/, "") ?? null;
  if (tabOrigin && !isLocalApiBase(tabOrigin)) {
    tabOrigin = null;
  }
  if (tabOrigin) {
    return tabOrigin;
  }

  return buildDefault;
}
