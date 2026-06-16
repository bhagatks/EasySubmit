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
        className={[
          "w-full rounded-[12px] py-4 text-base font-semibold text-white transition-opacity",
          disabled
            ? "cursor-not-allowed bg-[#12B3D1] opacity-40"
            : "bg-[#12B3D1] hover:opacity-90",
        ].join(" ")}
      >
        {label}
      </button>
    </div>
  );
}
