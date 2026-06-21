import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  AI_ENGINE_CONFIG_KEY,
  AI_ENGINE_DEFAULTS,
} from "../src/lib/services/ai-engine-config";
import { getFeatureFlagSeedRows } from "../src/lib/services/feature-flags-service";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const DATA_REFRESH_KEY = "dataRefresh";
const AI_CONFIG_KEY = "aiConfig";
const AI_PRICING_MAP_KEY = "ai_pricing_map";
const ENHANCE_WITH_AI_CONFIG_KEY = "enhanceWithAi";

const DATA_REFRESH_VALUE = {
  aiModelsUpdate: 1440,
  interval: 1440,
  description: "Refresh interval in minutes (1440 = 24 hours)",
};

function buildAiConfigValue() {
  return {
    defaultProvider: "gemini",
    discoveryEnabled: true,
    lastGlobalSync: new Date().toISOString(),
  };
}

const AI_PRICING_MAP_VALUE = {
  default: { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  models: {
    "gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
    "gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.01 },
    "claude-3-5-haiku-latest": { inputPer1k: 0.0008, outputPer1k: 0.004 },
    "claude-3-5-sonnet-latest": { inputPer1k: 0.003, outputPer1k: 0.015 },
    "gemini-2.0-flash": { inputPer1k: 0.0001, outputPer1k: 0.0004 },
    "gemini-2.5-flash": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
    "deepseek-chat": { inputPer1k: 0.00014, outputPer1k: 0.00028 },
  },
  patterns: [
    { match: "claude", inputPer1k: 0.003, outputPer1k: 0.015 },
    { match: "gemini", inputPer1k: 0.0001, outputPer1k: 0.0004 },
    { match: "gpt-4o", inputPer1k: 0.0025, outputPer1k: 0.01 },
    { match: "deepseek", inputPer1k: 0.00014, outputPer1k: 0.00028 },
    { match: "llama", inputPer1k: 0.00005, outputPer1k: 0.00008 },
  ],
};

const ENHANCE_WITH_AI_VALUE = {
  enhanceWithAiTimeoutMs: 90_000,
};

const AI_ENGINE_VALUE = AI_ENGINE_DEFAULTS;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();

  try {
    await prisma.appConfig.upsert({
      where: { key: DATA_REFRESH_KEY },
      create: {
        key: DATA_REFRESH_KEY,
        value: DATA_REFRESH_VALUE,
      },
      update: {
        value: DATA_REFRESH_VALUE,
      },
    });

    await prisma.appConfig.upsert({
      where: { key: AI_CONFIG_KEY },
      create: {
        key: AI_CONFIG_KEY,
        value: buildAiConfigValue(),
      },
      update: {
        value: buildAiConfigValue(),
      },
    });

    await prisma.appConfig.upsert({
      where: { key: AI_PRICING_MAP_KEY },
      create: {
        key: AI_PRICING_MAP_KEY,
        value: AI_PRICING_MAP_VALUE,
      },
      update: {
        value: AI_PRICING_MAP_VALUE,
      },
    });

    await prisma.appConfig.upsert({
      where: { key: ENHANCE_WITH_AI_CONFIG_KEY },
      create: {
        key: ENHANCE_WITH_AI_CONFIG_KEY,
        value: ENHANCE_WITH_AI_VALUE,
      },
      update: {
        value: ENHANCE_WITH_AI_VALUE,
      },
    });

    await prisma.appConfig.upsert({
      where: { key: AI_ENGINE_CONFIG_KEY },
      create: {
        key: AI_ENGINE_CONFIG_KEY,
        value: AI_ENGINE_VALUE,
      },
      update: {
        value: AI_ENGINE_VALUE,
      },
    });

    for (const flag of getFeatureFlagSeedRows()) {
      await prisma.featureFlag.upsert({
        where: { key: flag.key },
        create: {
          key: flag.key,
          enabled: flag.defaultEnabled,
          description: flag.description,
          ...(flag.defaultExtra ? { extra: flag.defaultExtra } : {}),
        },
        update: {
          description: flag.description,
        },
      });
    }

    console.log(
      `Seeded AppConfig keys: ${DATA_REFRESH_KEY}, ${AI_CONFIG_KEY}, ${AI_PRICING_MAP_KEY}, ${ENHANCE_WITH_AI_CONFIG_KEY}, ${AI_ENGINE_CONFIG_KEY}; feature_flags registry`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
