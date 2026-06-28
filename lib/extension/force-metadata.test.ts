import { describe, expect, it } from "vitest";
import { buildFallbackJobMetadata } from "@/src/shared/extension/force-metadata";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";

const config: ExtensionRuntimeConfig = {
  extensionGlobalSwitch: true,
  jobCardEnabled: true,
  enabledPlatforms: ["workday", "generic"],
  genericFallbackEnabled: true,
  minConfidence: 55,
  apiBaseUrl: "http://localhost:3000",
};

const walmartJobUrl =
  "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/job/Bentonville-AR/Senior-Manager--Program-Management_R-2522742?q=manager";

describe("buildFallbackJobMetadata", () => {
  it("uses Workday URL slug when the DOM is empty", () => {
    const doc = {
      title: "",
      querySelector: () => null,
      querySelectorAll: () => [],
      body: { innerText: "" },
      defaultView: { location: { href: walmartJobUrl } },
    } as unknown as Document;

    const metadata = buildFallbackJobMetadata(doc, walmartJobUrl, config);
    expect(metadata.title).toBe("Senior Manager, Program Management");
  });
});
