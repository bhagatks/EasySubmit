export const COMPLETED_ONBOARDING_STEP = 4;

export type DashboardGateUser = {
  onboardingStep: number;
  profiles: { id: string }[];
};

export function isDashboardSessionReady(user: DashboardGateUser): boolean {
  return (
    user.onboardingStep >= COMPLETED_ONBOARDING_STEP && user.profiles.length > 0
  );
}
