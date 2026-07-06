import { describe, expect, it } from "vitest";
import { classifyAiError } from "@/lib/ai/call-kernel/classify-ai-error";
import { SystemKeyPoolError } from "@/src/lib/ai/engine/system-key-pool";

describe("classifyAiError", () => {
  it("maps capacity_exhausted pool error", () => {
    const err = new SystemKeyPoolError("capacity_exhausted", "Daily cap reached");
    expect(classifyAiError(err, "system")).toMatchObject({
      classification: "capacity_exhausted",
      code: "capacity_exhausted",
    });
  });

  it("maps 429 to rate_limited", () => {
    const err = Object.assign(new Error("Too many requests"), { status: 429 });
    expect(classifyAiError(err, "customer")).toMatchObject({
      classification: "rate_limited",
      code: "rate_limited",
    });
  });

  it("maps auth errors on customer route", () => {
    const err = Object.assign(new Error("API key invalid"), { status: 401 });
    expect(classifyAiError(err, "customer")).toMatchObject({
      classification: "auth",
    });
  });

  it("maps overload messages to transient", () => {
    const err = new Error("Service unavailable — model overloaded");
    expect(classifyAiError(err, "system")).toMatchObject({
      classification: "transient",
    });
  });
});
