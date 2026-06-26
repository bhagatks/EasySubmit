import { describe, expect, it } from "vitest";
import { isEasySubmitManagedAppPage } from "@/src/shared/extension/easysubmit-app-page";

describe("isEasySubmitManagedAppPage", () => {
  it("matches dashboard and onboarding on localhost", () => {
    expect(isEasySubmitManagedAppPage("localhost", "/dashboard/job-tracker")).toBe(true);
    expect(isEasySubmitManagedAppPage("127.0.0.1", "/onboarding/resume")).toBe(true);
  });

  it("matches production app routes", () => {
    expect(isEasySubmitManagedAppPage("easysubmit.ai", "/dashboard/settings")).toBe(true);
    expect(isEasySubmitManagedAppPage("www.easysubmit.ai", "/login")).toBe(true);
  });

  it("allows extension bridge and external job sites", () => {
    expect(isEasySubmitManagedAppPage("localhost", "/extension/bridge")).toBe(false);
    expect(isEasySubmitManagedAppPage("boards.greenhouse.io", "/hightouch/jobs/1")).toBe(false);
  });
});
