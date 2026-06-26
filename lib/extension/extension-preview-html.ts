/** Extra CSS injected into resume/cover iframe previews inside the extension panel. */
export const EXTENSION_EMBED_PREVIEW_CSS = `
  html, body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  .page {
    width: 100%;
    max-width: 100%;
    padding: 0.625rem 0.875rem 1.25rem !important;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  h1 {
    font-size: clamp(15px, 4.8vw, 18pt);
    overflow-wrap: anywhere;
  }
  .contact {
    font-size: clamp(9px, 3.2vw, 10pt);
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .entry-head {
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .entry-meta {
    white-space: normal;
    text-align: right;
  }
  .summary, .body, li {
    overflow-wrap: anywhere;
  }
`;

export function prepareExtensionEmbedPreview(html: string): string {
  let prepared = html.replace(/<div class="toolbar-spacer"[^>]*>\s*<\/div>\s*/gi, "");
  if (!prepared.includes(EXTENSION_EMBED_PREVIEW_CSS.trim())) {
    prepared = prepared.replace("</style>", `${EXTENSION_EMBED_PREVIEW_CSS}</style>`);
  }
  return prepared;
}
