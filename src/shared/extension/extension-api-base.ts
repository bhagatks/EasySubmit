/** Injected at extension build time by scripts/build-extension.mjs — not used in Next.js web bundles. */
declare const __EASYSUBMIT_EXTENSION_API_BASE__: string;

export const DEFAULT_API_BASE = __EASYSUBMIT_EXTENSION_API_BASE__.replace(/\/$/, "");
