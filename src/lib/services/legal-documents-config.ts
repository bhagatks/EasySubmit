import { LEGAL_DOCUMENTS_DEFAULTS } from "@/src/lib/services/legal-documents-defaults";

/** `app_config` row key for Terms of Service and Privacy Policy content. */
export const LEGAL_DOCUMENTS_CONFIG_KEY = "legalDocuments";

export type LegalDocumentId = "terms" | "privacy";

export type LegalInline =
  | { kind: "text"; value: string }
  | { kind: "strong"; value: string }
  | { kind: "docLink"; doc: LegalDocumentId; label: string }
  | { kind: "href"; href: string; label: string; external?: boolean }
  | { kind: "mailto"; email: string; label?: string };

export type LegalListItem = string | { inlines: LegalInline[] };

export type LegalBlock =
  | { kind: "p"; inlines: LegalInline[] }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: LegalListItem[] };

export type LegalDocument = {
  title: string;
  updatedLabel: string;
  blocks: LegalBlock[];
};

export type LegalDocumentsConfig = {
  terms: LegalDocument;
  privacy: LegalDocument;
};

export { LEGAL_DOCUMENTS_DEFAULTS };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInline(value: unknown): LegalInline | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  switch (value.kind) {
    case "text":
    case "strong":
      return typeof value.value === "string" ? { kind: value.kind, value: value.value } : null;
    case "docLink":
      return value.doc === "terms" || value.doc === "privacy"
        ? typeof value.label === "string"
          ? { kind: "docLink", doc: value.doc, label: value.label }
          : null
        : null;
    case "href":
      return typeof value.href === "string" && typeof value.label === "string"
        ? {
            kind: "href",
            href: value.href,
            label: value.label,
            external: value.external === true,
          }
        : null;
    case "mailto":
      return typeof value.email === "string"
        ? {
            kind: "mailto",
            email: value.email,
            label: typeof value.label === "string" ? value.label : undefined,
          }
        : null;
    default:
      return null;
  }
}

function parseInlines(value: unknown): LegalInline[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const inlines: LegalInline[] = [];
  for (const item of value) {
    const inline = parseInline(item);
    if (!inline) {
      return null;
    }
    inlines.push(inline);
  }
  return inlines;
}

function parseListItem(value: unknown): LegalListItem | null {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  const inlines = parseInlines(value.inlines);
  return inlines ? { inlines } : null;
}

function parseBlock(value: unknown): LegalBlock | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  switch (value.kind) {
    case "p": {
      const inlines = parseInlines(value.inlines);
      return inlines ? { kind: "p", inlines } : null;
    }
    case "h2":
    case "h3":
      return typeof value.text === "string" ? { kind: value.kind, text: value.text } : null;
    case "ul": {
      if (!Array.isArray(value.items)) {
        return null;
      }
      const items: LegalListItem[] = [];
      for (const item of value.items) {
        const parsed = parseListItem(item);
        if (parsed === null) {
          return null;
        }
        items.push(parsed);
      }
      return { kind: "ul", items };
    }
    default:
      return null;
  }
}

function parseDocument(value: unknown, fallback: LegalDocument): LegalDocument {
  if (!isRecord(value)) {
    return fallback;
  }

  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title.trim()
      : fallback.title;
  const updatedLabel =
    typeof value.updatedLabel === "string" && value.updatedLabel.trim()
      ? value.updatedLabel.trim()
      : fallback.updatedLabel;

  if (!Array.isArray(value.blocks)) {
    return { title, updatedLabel, blocks: fallback.blocks };
  }

  const blocks: LegalBlock[] = [];
  for (const block of value.blocks) {
    const parsed = parseBlock(block);
    if (!parsed) {
      return fallback;
    }
    blocks.push(parsed);
  }

  if (blocks.length === 0) {
    return fallback;
  }

  return { title, updatedLabel, blocks };
}

export function parseLegalDocumentsConfig(value: unknown): LegalDocumentsConfig {
  if (!isRecord(value)) {
    return LEGAL_DOCUMENTS_DEFAULTS;
  }

  return {
    terms: parseDocument(value.terms, LEGAL_DOCUMENTS_DEFAULTS.terms),
    privacy: parseDocument(value.privacy, LEGAL_DOCUMENTS_DEFAULTS.privacy),
  };
}
