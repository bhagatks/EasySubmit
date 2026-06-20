import type { CareerArchitectureContent } from "@/src/lib/ai/engine-refinement";

export type ExecuteEngineRefinementInput = {
  /** Override Primary Fuel model; defaults to provider system default. */
  modelId?: string;
};

export type ExecuteEngineRefinementSuccess = {
  success: true;
  content: CareerArchitectureContent;
  targetRole: string;
  calibrationScore: number;
};

export type ExecuteEngineRefinementVaultLock = {
  success: false;
  status: "VAULT_LOCK";
  error: string;
};

export type ExecuteEngineRefinementFailure = {
  success: false;
  status: "ERROR";
  error: string;
  code?: string;
};

export type ExecuteEngineRefinementResult =
  | ExecuteEngineRefinementSuccess
  | ExecuteEngineRefinementVaultLock
  | ExecuteEngineRefinementFailure;
