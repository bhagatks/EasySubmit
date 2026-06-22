import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/job-tracker/export/html-escape";

describe("escapeHtml", () => {
  it("escapes core HTML entities", () => {
    expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;");
  });

  it("leaves safe text unchanged", () => {
    expect(escapeHtml("Hello world 123")).toBe("Hello world 123");
  });
});
