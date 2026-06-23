import type {
  LegalBlock,
  LegalDocumentId,
  LegalInline,
  LegalListItem,
} from "@/src/lib/services/legal-documents-config";

type LegalDocumentRendererProps = {
  blocks: LegalBlock[];
  /** Opens the linked document in-app (overlay). When omitted, uses `/terms` and `/privacy` routes. */
  onDocLink?: (doc: LegalDocumentId) => void;
};

const DOC_HREF: Record<LegalDocumentId, string> = {
  terms: "/terms",
  privacy: "/privacy",
};

function renderInline(inline: LegalInline, onDocLink?: (doc: LegalDocumentId) => void) {
  switch (inline.kind) {
    case "text":
      return inline.value;
    case "strong":
      return <strong>{inline.value}</strong>;
    case "docLink":
      if (onDocLink) {
        return (
          <button
            type="button"
            onClick={() => onDocLink(inline.doc)}
            className="font-medium text-primary hover:underline"
          >
            {inline.label}
          </button>
        );
      }
      return (
        <a href={DOC_HREF[inline.doc]} className="text-primary hover:underline">
          {inline.label}
        </a>
      );
    case "href":
      return (
        <a
          href={inline.href}
          className="text-primary hover:underline"
          {...(inline.external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {inline.label}
        </a>
      );
    case "mailto":
      return (
        <a href={`mailto:${inline.email}`} className="text-primary hover:underline">
          {inline.label ?? inline.email}
        </a>
      );
    default:
      return null;
  }
}

function renderInlines(inlines: LegalInline[], onDocLink?: (doc: LegalDocumentId) => void) {
  return inlines.map((inline, index) => (
    <span key={index}>{renderInline(inline, onDocLink)}</span>
  ));
}

function renderListItem(item: LegalListItem, onDocLink?: (doc: LegalDocumentId) => void) {
  if (typeof item === "string") {
    return item;
  }
  return renderInlines(item.inlines, onDocLink);
}

export function LegalDocumentRenderer({ blocks, onDocLink }: LegalDocumentRendererProps) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "p":
            return <p key={index}>{renderInlines(block.inlines, onDocLink)}</p>;
          case "h2":
            return <h2 key={index}>{block.text}</h2>;
          case "h3":
            return <h3 key={index}>{block.text}</h3>;
          case "ul":
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderListItem(item, onDocLink)}</li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
