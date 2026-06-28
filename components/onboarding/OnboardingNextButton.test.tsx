import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingNextButton from "./OnboardingNextButton";

vi.mock("@/src/shared/brand-buttons", () => ({
  webButtonPurposeProps: () => ({ variant: "default", className: "" }),
}));

describe("OnboardingNextButton", () => {
  it("renders with default Continue label", () => {
    render(<OnboardingNextButton onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    render(<OnboardingNextButton onClick={vi.fn()} label="Get started" />);
    expect(screen.getByRole("button", { name: "Get started" })).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const handler = vi.fn();
    render(<OnboardingNextButton onClick={handler} />);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<OnboardingNextButton onClick={vi.fn()} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not fire onClick when disabled", async () => {
    const handler = vi.fn();
    render(<OnboardingNextButton onClick={handler} disabled />);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).not.toHaveBeenCalled();
  });
});
