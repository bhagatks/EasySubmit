import { describe, expect, it } from "vitest";
import {
  extractOpenRouterFreeModelIds,
  filterOpenRouterFreeModelIds,
  isOpenRouterFreeModelId,
  parseOpenRouterModelsListPayload,
} from "@/lib/ai/openrouter/free-model-catalog";

describe("free-model-catalog", () => {
  it("detects :free model ids", () => {
    expect(isOpenRouterFreeModelId("meta-llama/llama-3.3-70b-instruct:free")).toBe(true);
    expect(isOpenRouterFreeModelId("deepseek/deepseek-chat")).toBe(false);
  });

  it("filters and dedupes free model ids", () => {
    expect(
      filterOpenRouterFreeModelIds([
        "a/model:free",
        "a/model:free",
        "b/model:free",
        "c/paid",
      ]),
    ).toEqual(["a/model:free", "b/model:free"]);
  });

  it("parses OpenRouter models list payload", () => {
    const ids = extractOpenRouterFreeModelIds({
      data: [
        { id: "nvidia/nemotron:free", name: "Nemotron" },
        { id: "openai/gpt-4o", name: "GPT-4o" },
        { id: "qwen/qwen3:free" },
      ],
    });
    expect(ids).toEqual(["nvidia/nemotron:free", "qwen/qwen3:free"]);
    expect(parseOpenRouterModelsListPayload(null)).toEqual([]);
  });
});
