import { describe, expect, it } from "vitest";
import {
  filterCareerGradeModels,
  HANDSHAKE_PROVIDERS,
  isCareerGradeModel,
  isHandshakeProvider,
  sortCareerGradeModels,
  suggestPrimaryFuel,
} from "@/src/lib/config/career-grade-models";

describe("career-grade-models", () => {
  it("accepts flagship OpenAI and Anthropic models", () => {
    expect(isCareerGradeModel("openai", "gpt-4o")).toBe(true);
    expect(isCareerGradeModel("openai", "gpt-4o-mini")).toBe(true);
    expect(isCareerGradeModel("anthropic", "claude-3-5-sonnet-latest")).toBe(true);
    expect(isCareerGradeModel("anthropic", "claude-3-opus-20240229")).toBe(true);
  });

  it("rejects embedding and legacy models", () => {
    expect(isCareerGradeModel("openai", "text-embedding-3-large")).toBe(false);
    expect(isCareerGradeModel("openai", "gpt-3.5-turbo")).toBe(false);
    expect(isCareerGradeModel("anthropic", "claude-instant-1.2")).toBe(false);
  });

  it("filters and sorts discovered models with career-grade priority", () => {
    const filtered = filterCareerGradeModels("openai", [
      "gpt-4o-mini",
      "gpt-3.5-turbo",
      "gpt-4o",
      "text-embedding-3-small",
    ]);

    expect(filtered).toEqual(["gpt-4o", "gpt-4o-mini"]);
  });

  it("falls back to bundled defaults when API list has no matches", () => {
    const filtered = filterCareerGradeModels("anthropic", ["claude-instant-1.2"]);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0]).toMatch(/claude-(sonnet-4|3-5-sonnet)/);
  });

  it("suggests the top-ranked primary fuel model", () => {
    const primary = suggestPrimaryFuel("openai", ["gpt-4o-mini", "gpt-4o"]);
    expect(primary).toBe("gpt-4o");
  });

  it("validates handshake providers", () => {
    expect(isHandshakeProvider("openai")).toBe(true);
    expect(isHandshakeProvider("gemini")).toBe(true);
    expect(isHandshakeProvider("mistral")).toBe(true);
    expect(isHandshakeProvider("custom")).toBe(true);
    expect(isHandshakeProvider("grok")).toBe(false);
    expect(HANDSHAKE_PROVIDERS.length).toBeGreaterThanOrEqual(13);
  });

  it("accepts career-grade models for expanded providers", () => {
    expect(isCareerGradeModel("gemini", "gemini-2.5-flash")).toBe(true);
    expect(isCareerGradeModel("gemini", "gemini-1.5-flash")).toBe(true);
    expect(isCareerGradeModel("groq", "llama-3.3-70b-versatile")).toBe(true);
    expect(isCareerGradeModel("deepseek", "deepseek-chat")).toBe(true);
    expect(isCareerGradeModel("openrouter", "openai/gpt-4o")).toBe(true);
  });

  it("deduplicates sorted models", () => {
    const sorted = sortCareerGradeModels("openai", ["gpt-4o", "gpt-4o", "gpt-4o-mini"]);
    expect(sorted).toEqual(["gpt-4o", "gpt-4o-mini"]);
  });
});
