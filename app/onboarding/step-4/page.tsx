import { redirect } from "next/navigation";

/** Legacy route — calibration now runs as wizard step 3. */
export default function OnboardingStep4Page() {
  redirect("/onboarding");
}
