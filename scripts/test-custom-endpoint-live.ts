#!/usr/bin/env npx tsx
/** Live smoke test for custom OpenAI-compatible BYOK endpoint (reads key from env). */
import { performEngineHandshake } from "@/src/lib/ai/discovery-service";
import { handshakeProviderModels } from "@/src/lib/ai/server-model-discovery";

const BASE = process.env.CUSTOM_ENDPOINT_URL?.trim() || "https://aihubmix.com/v1";
const KEY = process.env.CUSTOM_ENDPOINT_KEY?.trim() ?? "";
const MODEL = process.env.CUSTOM_MODEL_ID?.trim() || "coding-glm-5.1-free";

async function main() {
  if (!KEY) {
    console.error("Set CUSTOM_ENDPOINT_KEY (and optionally CUSTOM_ENDPOINT_URL, CUSTOM_MODEL_ID)");
    process.exit(1);
  }

  console.log("endpoint:", BASE);
  console.log("model:", MODEL);
  console.log("key:", KEY.slice(0, 8) + "…" + KEY.slice(-4));

  console.log("\n=== handshakeProviderModels ===");
  const hs = await handshakeProviderModels("custom", KEY, {
    customEndpointUrl: BASE,
    customModelId: MODEL,
  });
  console.log(JSON.stringify(hs, null, 2));
  if (!hs.ok) process.exit(1);

  console.log("\n=== performEngineHandshake ===");
  const eng = await performEngineHandshake({
    provider: "custom",
    apiKey: KEY,
    customEndpointUrl: BASE,
    customModelId: MODEL,
  });
  if (eng.success) {
    console.log(
      JSON.stringify(
        {
          success: true,
          rawModelCount: eng.rawModelCount,
          modelCount: eng.models.length,
          modelsSample: eng.models.slice(0, 20),
          suggestedPrimaryFuel: eng.suggestedPrimaryFuel,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(JSON.stringify(eng, null, 2));
    process.exit(1);
  }

  console.log("\n=== chat/completions probe ===");
  const res = await fetch(`${BASE.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: "Reply with exactly: OK" }],
      max_tokens: 32,
    }),
  });
  const json = (await res.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: Record<string, number>;
    error?: { message?: string; code?: string };
  };
  console.log("HTTP", res.status);
  console.log("model:", json.model ?? "—");
  console.log("finish:", json.choices?.[0]?.finish_reason ?? "—");
  console.log("content:", JSON.stringify(json.choices?.[0]?.message?.content ?? null));
  console.log("usage:", JSON.stringify(json.usage ?? null));
  if (json.error) console.log("error:", JSON.stringify(json.error));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
