import { describe, expect, it } from "vitest";
import { detectJobPage } from "@/src/shared/extension/detect-job-page";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";

const config: ExtensionRuntimeConfig = {
  extensionGlobalSwitch: true,
  jobCardEnabled: true,
  enabledPlatforms: ["linkedin", "indeed", "greenhouse", "workday", "generic"],
  genericFallbackEnabled: true,
  minConfidence: 55,
  apiBaseUrl: "http://localhost:3000",
};

describe("detectJobPage", () => {
  it("detects linkedin-style job pages", () => {
    const doc = document.implementation.createHTMLDocument("job");
    doc.body.innerHTML = `
      <main class="jobs-search__job-details">
        <h1>Senior Engineer</h1>
        <div class="job-details-jobs-unified-top-card__company-name">Acme</div>
        <div class="jobs-description__content">${"x".repeat(120)}</div>
        <button>Apply</button>
      </main>
    `;

    const result = detectJobPage(
      doc,
      "https://www.linkedin.com/jobs/view/12345",
      config,
    );

    expect(result?.metadata.title).toBe("Senior Engineer");
    expect(result?.metadata.platform).toBe("linkedin");
  });
});
