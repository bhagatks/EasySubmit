export type EnhanceFeedbackTier = "formatting" | "role_mismatch" | "success";

export function resolveEnhanceFeedbackTier(input: {
  engineMode: "ai" | "deterministic";
  coherenceWarnings?: string[];
  isCrossDomain?: boolean;
}): EnhanceFeedbackTier {
  const roleMismatch =
    input.isCrossDomain ||
    input.coherenceWarnings?.some(
      (note) =>
        note.includes("may not match your experience") ||
        note.includes("may not align") ||
        note.includes("cross-domain"),
    );

  if (roleMismatch) return "role_mismatch";
  if (input.engineMode === "deterministic") return "formatting";
  return "success";
}

export function enhanceFeedbackTierLabel(tier: EnhanceFeedbackTier): string {
  switch (tier) {
    case "formatting":
      return "Formatting & ATS keywords";
    case "role_mismatch":
      return "Role alignment warning";
    case "success":
      return "Resume enhanced";
  }
}
