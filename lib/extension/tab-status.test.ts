import { describe, expect, it } from "vitest";
import { presentationToTabStatus, tabStatusLabel } from "@/src/shared/extension/tab-status";

describe("tab-status", () => {
  it("maps manual capture to manual status", () => {
    expect(presentationToTabStatus("manual_capture")).toEqual({
      status: "manual",
      cardVisible: true,
      saved: undefined,
      jobStatus: undefined,
    });
  });

  it("builds a detected label with company", () => {
    const label = tabStatusLabel({
      status: "detected",
      title: "Senior Engineer",
      company: "Acme",
    });
    expect(label).toBe("Senior Engineer · Acme");
  });

  it("builds loading label for scrape hydration", () => {
    expect(tabStatusLabel({ status: "loading" })).toBe("Reading job details…");
  });
});
