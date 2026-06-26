"use client";

import { PurposeButton } from "@/components/ui/purpose-button";

interface OnboardingNextButtonProps {
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}

export default function OnboardingNextButton({
  disabled = false,
  onClick,
  label = "Continue",
}: OnboardingNextButtonProps) {
  return (
    <div className="mt-auto pt-10">
      <PurposeButton
        type="button"
        purpose="primary"
        disabled={disabled}
        onClick={onClick}
        size="lg"
        className="w-full"
      >
        {label}
      </PurposeButton>
    </div>
  );
}
