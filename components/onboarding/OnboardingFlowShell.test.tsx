import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PhaseStep, OnboardingFlowShell } from "./OnboardingFlowShell";

vi.mock("@/components/ui/logo", () => ({ LogoIcon: () => <span data-testid="logo" /> }));
vi.mock("@/components/ui/brand-wordmark", () => ({
  BrandWordmark: () => <span>EasySubmit</span>,
}));
vi.mock("@/components/auth/SignOutButton", () => ({
  SignOutButton: () => <button>Sign out</button>,
}));
vi.mock("@/src/stores/onboarding-store", () => ({
  useOnboardingStore: () => false,
}));

describe("PhaseStep", () => {
  it("shows step number when not active or complete", () => {
    render(
      <ul>
        <PhaseStep id={2} label="Experience" activePhase={1} />
      </ul>,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  });

  it("shows checkmark when complete", () => {
    render(
      <ul>
        <PhaseStep id={1} label="Profile" activePhase={3} />
      </ul>,
    );
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("shows In progress label on active phase", () => {
    render(
      <ul>
        <PhaseStep id={2} label="Experience" activePhase={2} />
      </ul>,
    );
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });
});

describe("OnboardingFlowShell", () => {
  it("renders wizard layout on a step route", () => {
    vi.mocked(usePathname).mockReturnValue("/onboarding/hub");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1", onboardingStep: 2 }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<OnboardingFlowShell>step content</OnboardingFlowShell>);

    expect(screen.getByText("step content")).toBeInTheDocument();
    expect(screen.getByText("Your setup")).toBeInTheDocument();
  });

  it("renders full-screen layout on workbench route", () => {
    vi.mocked(usePathname).mockReturnValue("/onboarding/workbench");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1", onboardingStep: 5 }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { container } = render(
      <OnboardingFlowShell>workbench content</OnboardingFlowShell>,
    );

    expect(screen.getByText("workbench content")).toBeInTheDocument();
    expect(screen.queryByText("Your setup")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass("min-h-screen");
  });

  it("renders full-screen layout on root onboarding route", () => {
    vi.mocked(usePathname).mockReturnValue("/onboarding");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1", onboardingStep: 0 }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<OnboardingFlowShell>root content</OnboardingFlowShell>);
    expect(screen.queryByText("Your setup")).not.toBeInTheDocument();
  });
});
