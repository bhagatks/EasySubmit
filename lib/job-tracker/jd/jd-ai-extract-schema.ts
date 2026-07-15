import { z } from "zod";

const impactDimensionSchema = z.enum([
  "reliability",
  "scale",
  "speed",
  "cost",
  "revenue",
  "quality",
  "security",
  "team",
  "delivery",
]);

const velocitySignalSchema = z.enum(["fast", "moderate", "structured"]).nullable();
const ownershipLevelSchema = z.enum(["high", "medium", "low"]).nullable();

export const jdAiExtractSchema = z.object({
  mustHaveSkills: z
    .array(z.string())
    .max(30)
    .describe("Specific tools, languages, platforms explicitly required — use exact JD wording"),
  preferredSkills: z.array(z.string()).max(20).default([]),
  mustHaveYearsExp: z.number().int().positive().nullable().default(null),
  mustHaveDegree: z.string().max(120).nullable().default(null),
  mustHaveCerts: z.array(z.string()).max(10).default([]),
  summaryTheme: z
    .string()
    .max(240)
    .default("")
    .describe("One sentence — what the resume summary MUST lead with for this role"),
  targetVerbs: z
    .array(z.string().max(24))
    .max(10)
    .default([])
    .describe("Past-tense action verbs from the responsibilities section"),
  deliverables: z.array(z.string()).max(12).default([]),
  impactDimensions: z.array(impactDimensionSchema).max(5).default([]),
  emphasisAreas: z
    .array(z.string().max(80))
    .max(6)
    .default([])
    .describe(
      "Broader domains or architectural patterns — NOT specific tools (e.g. Distributed Systems, not Python or Kafka)",
    ),
  deprioritize: z.array(z.string()).max(10).default([]),
  velocitySignal: velocitySignalSchema.default(null),
  ownershipLevel: ownershipLevelSchema.default(null),
  industryDomain: z.array(z.string()).max(5).default([]),
  preferredDomain: z.array(z.string()).max(5).default([]),
});

export type JdAiExtractPayload = z.infer<typeof jdAiExtractSchema>;
