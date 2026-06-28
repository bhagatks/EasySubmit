import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhaseProgressBar } from "./OnboardingWorkbenchChrome";

vi.mock("@/components/ui/logo", () => ({ LogoIcon: () => <span data-testid="logo" /> }));
vi.mock("@/components/ui/brand-wordmark", () => ({
  BrandWordmark: () => <span>EasySubmit</span>,
}));
vi.mock("@/components/auth/SignOutButton", () => ({
  SignOutButton: () => <button>Sign out</button>,
}));
vi.mock("@/components/onboarding/hub/SystemStatusBreadcrumb", () => ({
  SystemStatusBreadcrumb: () => <nav data-testid="breadcrumb" />,
}));
vi.mock("@/lib/onboarding/workbenchPhases", () => ({
  WORKBENCH_PHASE_COUNT: 4,
  getWorkbenchPhase: (id: number) => ({ id, label: `Phase ${id}`, description: "" }),
  workbenchPhaseHeader: (id: number) => `Phase ${id}`,
}));

describe("PhaseProgressBar", () => {
  it("has correct aria role and labels", () => {
    render(<PhaseProgressBar phase={2} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemin", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(bar).toHaveAttribute("aria-label", "Onboarding progress: phase 2 of 4");
  });

  it("renders at phase 1", () => {
    render(<PhaseProgressBar phase={1} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("renders at final phase", () => {
    render(<PhaseProgressBar phase={4} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
  });
});
