/**
 * Shadow DOM traversal utilities for ATS platforms that use Web Components
 * (Workday, iCIMS). Standard querySelectorAll() cannot cross shadow root boundaries.
 */

/**
 * Query an element across all nested shadow roots.
 * Returns the first matching element found via depth-first traversal.
 */
export function pierceQuerySelector(root: Document | Element | ShadowRoot, selector: string): Element | null {
  const direct = (root as Element | Document).querySelector?.(selector);
  if (direct) return direct;

  const walker = createShadowWalker(root);
  for (const el of walker) {
    if (el.shadowRoot) {
      const found = pierceQuerySelector(el.shadowRoot, selector);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Query all elements across all nested shadow roots.
 */
export function pierceQuerySelectorAll(root: Document | Element | ShadowRoot, selector: string): Element[] {
  const results: Element[] = [];

  const direct = (root as Element | Document).querySelectorAll?.(selector);
  if (direct) results.push(...Array.from(direct));

  const walker = createShadowWalker(root);
  for (const el of walker) {
    if (el.shadowRoot) {
      results.push(...pierceQuerySelectorAll(el.shadowRoot, selector));
    }
  }
  return results;
}

/**
 * Get text content from the first matching element across shadow roots.
 */
export function pierceTextContent(root: Document | Element | ShadowRoot, selector: string): string | null {
  const el = pierceQuerySelector(root, selector);
  return el ? el.textContent?.trim() || null : null;
}

function* createShadowWalker(root: Document | Element | ShadowRoot): Generator<Element> {
  const children = root.querySelectorAll?.("*") ?? (root as ShadowRoot).querySelectorAll("*");
  for (const el of Array.from(children)) {
    yield el;
  }
}
