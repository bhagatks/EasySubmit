"use client";

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
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="btn-primary"
      >
        {label}
      </button>
    </div>
  );
}
