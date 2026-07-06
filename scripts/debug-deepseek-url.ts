#!/usr/bin/env npx tsx
import dotenv from "dotenv";
import { generateText } from "ai";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { unvaultUserApiKey } = await import("../lib/vault/user-key-vault");
  const { createAiSdkLanguageModel } = await import("../src/lib/ai/ai-sdk-provider");
  const { getOpenAiCompatChatBaseUrl, getProviderChatUrl } = await import(
    "../src/lib/config/app.config"
  );
  const { prisma } = await import("../lib/prisma");

  console.log("chat base:", getOpenAiCompatChatBaseUrl("deepseek"));
  console.log("chat url:", getProviderChatUrl("deepseek"));

  const row = await prisma.userApiKey.findFirst({ where: { provider: "deepseek" } });
  if (!row) {
    console.log("no deepseek key");
    return;
  }

  const apiKey = await unvaultUserApiKey(row.userId, "deepseek");
  if (!apiKey) {
    console.log("unvault failed");
    return;
  }

  for (const url of [
    "https://api.deepseek.com/chat/completions",
    "https://api.deepseek.com/v1/chat/completions",
  ]) {
    for (const body of [
      {
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: "OK" }],
        max_tokens: 16,
      },
      {
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: "OK" }],
        max_tokens: 16,
        thinking: { type: "disabled" },
      },
    ]) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      console.log(
        `\nfetch ${url} thinking=${"thinking" in body && body.thinking ? body.thinking.type : "default"}`,
      );
      console.log(`status=${res.status} body=${text.slice(0, 120)}`);
    }
  }

  try {
    const model = createAiSdkLanguageModel("deepseek", apiKey, "deepseek-v4-flash");
    const result = await generateText({
      model,
      prompt: "Reply OK",
      maxOutputTokens: 16,
      maxRetries: 0,
    });
    console.log("\nSDK ok:", result.text.slice(0, 40));
  } catch (error) {
    const err = error as { message?: string; url?: string; statusCode?: number; responseBody?: string };
    console.log("\nSDK fail:", err.message);
    console.log("SDK url:", err.url ?? "n/a");
    console.log("SDK status:", err.statusCode ?? "n/a");
    console.log("SDK body:", (err.responseBody ?? "").slice(0, 200));
  }
}

main().catch(console.error);
