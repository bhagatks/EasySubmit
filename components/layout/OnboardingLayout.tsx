import FormSection from "@/components/layout/FormSection";
import VisualSection from "@/components/layout/VisualSection";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  /** Progress fill percentage (0–100) for the top bar */
  progress?: number;
}

export default function OnboardingLayout({
  children,
  currentStep,
  progress = 25,
}: OnboardingLayoutProps) {
  const isOdd = currentStep % 2 === 1;
  const formOrder = isOdd ? "lg:order-1" : "lg:order-2";
  const visualOrder = isOdd ? "lg:order-2" : "lg:order-1";

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#F9FAFB] lg:grid-cols-2">
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-200">
        <div
          className="h-full bg-[#12B3D1] transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <FormSection className={formOrder}>{children}</FormSection>
      <VisualSection currentStep={currentStep} className={visualOrder} />
    </div>
  );
}
