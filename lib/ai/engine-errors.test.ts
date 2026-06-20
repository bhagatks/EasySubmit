import { describe, expect, it } from "vitest";
import {
  ENGINE_ERRORS,
  formatEngineTerminalError,
  mapProviderFailureToEngineError,
} from "@/src/lib/ai/engine-errors";

describe("engine-errors", () => {
  it("formats JetBrains Mono terminal lines with padded error codes", () => {
    const error = formatEngineTerminalError(ENGINE_ERRORS.INVALID_KEY);
    expect(error.prefix).toBe("[ERR]");
    expect(error.code).toBe("INVALID_KEY");
    expect(error.terminalLine).toMatch(/^\[ERR\]\s+INVALID_KEY\s+\|\s+/);
    expect(error.terminalLine).toContain("401");
  });

  it("maps provider insufficient_quota to INSUFFICIENT_QUOTA", () => {
    const error = mapProviderFailureToEngineError(
      "insufficient_quota",
      "You exceeded your current quota.",
    );
    expect(error.code).toBe("INSUFFICIENT_QUOTA");
    expect(error.message).toContain("quota");
    expect(error.terminalLine).toContain("INSUFFICIENT_QUOTA");
  });

  it("maps missing career models code", () => {
    const error = mapProviderFailureToEngineError("no_career_models");
    expect(error.code).toBe("NO_CAREER_MODELS");
  });
});
