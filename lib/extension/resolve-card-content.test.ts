/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { resolveCardContent } from "@/extension/src/content/resolve-card-content";
import { EXTENSION_RUNTIME_DEFAULTS } from "@shared/extension/runtime-config-merge";

function docWithBody(html: string): Document {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = html;
  return doc;
}

describe("resolveCardContent", () => {
  it("manual launch prefers loading on job pages without enough description", () => {
    const doc = docWithBody("<main><h1>Engineer</h1></main>");
    const result = resolveCardContent({
      doc,
      url: "https://www.linkedin.com/jobs/view/123",
      config: EXTENSION_RUNTIME_DEFAULTS,
      launch: "manual",
      interceptedMetadata: null,
    });
    expect(result.presentation).toBe("loading");
  });

  it("manual launch opens manual capture on unrelated pages", () => {
    const doc = docWithBody("<main><p>Blog post</p></main>");
    const result = resolveCardContent({
      doc,
      url: "https://example.com/blog/hiring",
      config: EXTENSION_RUNTIME_DEFAULTS,
      launch: "manual",
      interceptedMetadata: null,
    });
    expect(result.presentation).toBe("manual_capture");
  });

  it("auto launch shows loading while job description is still hydrating", () => {
    const doc = docWithBody("<main><h1>Software Engineer</h1><p>Short</p></main>");
    const result = resolveCardContent({
      doc,
      url: "https://www.linkedin.com/jobs/view/12345",
      config: EXTENSION_RUNTIME_DEFAULTS,
      launch: "auto",
      interceptedMetadata: null,
    });
    expect(result.presentation).toBe("loading");
  });

  it("auto launch rejects generic Jobs hub title on job-board browse pages", () => {
    const description = "We are hiring engineers across teams. ".repeat(8);
    const doc = docWithBody(`<main><h1>Jobs</h1><p>${description}</p></main>`);
    const result = resolveCardContent({
      doc,
      url: "https://www.linkedin.com/jobs/",
      config: EXTENSION_RUNTIME_DEFAULTS,
      launch: "auto",
      interceptedMetadata: null,
    });
    expect(result.presentation).toBe("no_job");
    expect(result.metadata.title).not.toBe("Jobs");
  });
});
