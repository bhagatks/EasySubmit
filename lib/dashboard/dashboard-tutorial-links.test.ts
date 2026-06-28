import { describe, expect, it } from "vitest";
import {
  DASHBOARD_TUTORIALS_HREF,
  DASHBOARD_TUTORIALS_WELCOME_HREF,
  DASHBOARD_TUTORIALS_WELCOME_QUERY,
} from "@/lib/dashboard/dashboard-tutorial-links";

describe("dashboard-tutorial-links", () => {
  it("builds welcome tutorials href with query param", () => {
    expect(DASHBOARD_TUTORIALS_HREF).toBe("/dashboard/tutorials");
    expect(DASHBOARD_TUTORIALS_WELCOME_QUERY).toBe("welcome=1");
    expect(DASHBOARD_TUTORIALS_WELCOME_HREF).toBe("/dashboard/tutorials?welcome=1");
  });
});
