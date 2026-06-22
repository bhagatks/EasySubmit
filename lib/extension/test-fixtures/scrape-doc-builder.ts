/**
 * Lightweight DOM mock for scraper integration tests (no jsdom dependency).
 * Supports selectors used by site adapters + scrape-helpers.
 */
export type ScrapeDocFixture = {
  url: string;
  documentTitle?: string;
  ogTitle?: string;
  h1?: string;
  bodyText?: string;
  /** selector → textContent (first match wins for querySelector) */
  elements?: Record<string, string>;
  buttons?: string[];
  /** Raw JSON-LD script bodies */
  jsonLd?: string[];
};

function matchesSelector(elKey: string, selector: string): boolean {
  if (selector === elKey) return true;
  if (selector.startsWith("[data-ph-at-id='") && selector.endsWith("']")) {
    const id = selector.slice(18, -2);
    return elKey === `[data-ph-at-id=${id}]` || elKey === `[data-ph-at-id='${id}']`;
  }
  if (selector.startsWith("[data-testid='") && selector.endsWith("']")) {
    const id = selector.slice(15, -2);
    return elKey === `[data-testid=${id}]` || elKey === `[data-testid='${id}']`;
  }
  if (selector.startsWith("[data-automation-id='") && selector.endsWith("']")) {
    const id = selector.slice(22, -2);
    return elKey === `[data-automation-id=${id}]` || elKey === `[data-automation-id='${id}']`;
  }
  if (selector.startsWith(".")) {
    const cls = selector.slice(1);
    return elKey.startsWith(`.${cls}`) || elKey.includes(cls);
  }
  if (selector === "h1") return elKey === "h1";
  if (selector === "h2") return elKey === "h2";
  if (selector === "main") return elKey === "main";
  if (selector === "body") return elKey === "body";
  if (selector.includes("[class*='")) {
    const m = selector.match(/\[class\*='([^']+)'\]/);
    if (m?.[1] && elKey.includes(m[1])) return true;
  }
  return false;
}

export function buildScrapeDocument(fixture: ScrapeDocFixture): Document {
  const elements = fixture.elements ?? {};
  const elementEntries = Object.entries(elements);

  const querySelector = (sel: string): Element | null => {
    if (sel === 'meta[property="og:title"]' && fixture.ogTitle) {
      return {
        getAttribute: (name: string) => (name === "content" ? fixture.ogTitle! : null),
        textContent: fixture.ogTitle,
      } as unknown as Element;
    }
    if (sel === "h1" && fixture.h1) {
      return { textContent: fixture.h1 } as unknown as Element;
    }

    for (const [key, value] of elementEntries) {
      if (matchesSelector(key, sel)) {
        return { textContent: value, getAttribute: () => null } as unknown as Element;
      }
    }

    if (sel === "main" || sel === "body") {
      return { textContent: fixture.bodyText ?? "" } as unknown as Element;
    }

    return null;
  };

  const querySelectorAll = (sel: string): Element[] => {
    if (sel === 'script[type="application/ld+json"]') {
      return (fixture.jsonLd ?? []).map(
        (content) => ({ textContent: content, getAttribute: () => null }) as unknown as Element,
      );
    }
    if (sel.includes("button") || sel.includes("[role='button']")) {
      return (fixture.buttons ?? []).map(
        (label) => ({ textContent: label, getAttribute: () => null }) as unknown as Element,
      );
    }
    if (sel.includes("[data-automation-id='location']")) {
      const loc = elements["[data-automation-id=location]"];
      return loc ? [{ textContent: loc, getAttribute: () => null } as unknown as Element] : [];
    }
    const single = querySelector(sel);
    return single ? [single] : [];
  };

  return {
    title: fixture.documentTitle ?? fixture.ogTitle ?? fixture.h1 ?? "",
    body: { innerText: fixture.bodyText ?? "" },
    querySelector,
    querySelectorAll,
    defaultView: { location: { href: fixture.url } },
  } as unknown as Document;
}
