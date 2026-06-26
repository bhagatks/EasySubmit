/** Inline SVG strings for extension Shadow DOM — mirrors dashboard format-download-icons. */

const DOCUMENT_DOWNLOAD_FRAME = (inner: string) =>
  `<svg class="preview-icon-svg preview-format-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>${inner}<path class="preview-dl-shaft" d="M12 15v4"/><path class="preview-dl-head" d="m9.5 17 2.5 2.5 2.5-2.5"/><path class="preview-dl-tray" d="M8 21h8"/></svg>`;

export const PDF_DOWNLOAD_ICON_SVG = DOCUMENT_DOWNLOAD_FRAME(
  `<text class="preview-pdf-label" x="12" y="10.5" text-anchor="middle" font-size="4.25" font-weight="700" fill="currentColor" stroke="none" font-family="ui-sans-serif, system-ui, sans-serif">PDF</text>`,
);

export const WORD_DOWNLOAD_ICON_SVG = DOCUMENT_DOWNLOAD_FRAME(
  `<path class="preview-word-line preview-word-line-1" d="M8 7.5h6" stroke-width="1.75"/><path class="preview-word-line preview-word-line-2" d="M8 9.75h7" stroke-width="1.75"/><path class="preview-word-line preview-word-line-3" d="M8 12h5" stroke-width="1.75"/>`,
);
