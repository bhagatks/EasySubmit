export const ONE_CLICK_APPLY_PLATFORMS = ["workday"] as const;

export type ApplyPipelinePhase = "capture" | "tailor" | "autofill";

export type OneClickApplyPlatform = (typeof ONE_CLICK_APPLY_PLATFORMS)[number];

export function isOneClickPlatform(platform: string | null | undefined): boolean {
  if (!platform) return false;
  return ONE_CLICK_APPLY_PLATFORMS.includes(
    platform.toLowerCase() as OneClickApplyPlatform,
  );
}
