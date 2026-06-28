import { describe, expect, it } from "vitest";
import { DASHBOARD_WORKSPACE_WIDTH_CLASS } from "@/lib/dashboard/dashboard-layout";

describe("dashboard-layout", () => {
  it("uses max-w-3xl workspace width for all dashboard tabs", () => {
    expect(DASHBOARD_WORKSPACE_WIDTH_CLASS).toBe("mx-auto w-full max-w-3xl");
  });
});
