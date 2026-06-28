import { describe, expect, it } from "vitest";
import {
  ENHANCE_DIAGNOSTICS_DEFAULTS,
  parseEnhanceDiagnosticsConfig,
  resolveEnhanceDiagnosticsConfig,
  shouldEmitEnhanceDiagnosticLog,
} from "@/src/lib/services/enhance-diagnostics-config";
import { PIPELINE_STEP_TO_DESIGN } from "@/src/lib/ai/engine/enhance-diagnostics-catalog";

describe("enhance diagnostics config", () => {
  it("defaults to enabled with light threshold (maximum detail)", () => {
    expect(ENHANCE_DIAGNOSTICS_DEFAULTS).toEqual({
      enabled: true,
      logThreshold: "light",
    });
  });

  it("parses logThreshold and legacy logLevel keys", () => {
    expect(parseEnhanceDiagnosticsConfig({ logThreshold: "high" })).toEqual({
      enabled: true,
      logThreshold: "high",
    });
    expect(parseEnhanceDiagnosticsConfig({ logLevel: "low", enabled: false })).toEqual({
      enabled: false,
      logThreshold: "low",
    });
  });

  it("falls back to defaults when DB row missing", () => {
    expect(resolveEnhanceDiagnosticsConfig(null)).toEqual(ENHANCE_DIAGNOSTICS_DEFAULTS);
  });

  it("filters by threshold — high config emits only high events", () => {
    expect(shouldEmitEnhanceDiagnosticLog("high", "light")).toBe(false);
    expect(shouldEmitEnhanceDiagnosticLog("high", "low")).toBe(false);
    expect(shouldEmitEnhanceDiagnosticLog("high", "high")).toBe(true);
  });

  it("filters by threshold — light config emits all events", () => {
    expect(shouldEmitEnhanceDiagnosticLog("light", "light")).toBe(true);
    expect(shouldEmitEnhanceDiagnosticLog("light", "low")).toBe(true);
    expect(shouldEmitEnhanceDiagnosticLog("light", "high")).toBe(true);
  });

  it("maps pipeline steps to design doc ids for operator lookup", () => {
    expect(PIPELINE_STEP_TO_DESIGN["27c_ai_upgrade_fail"]).toBe("13");
    expect(PIPELINE_STEP_TO_DESIGN["75_pre_jd_brain"]).toBe("8");
  });
});
