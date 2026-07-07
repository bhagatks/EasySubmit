import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = path.resolve(__dirname, "..");

// Tests import lib/prisma.ts, which constructs a Prisma client at module load and
// throws when DATABASE_URL is missing. Load .env.local here (config is evaluated
// before any test worker starts) so `npm test`, `npm run test:coverage`, and the
// pre-push hook all have the local dev env — matching how `run easy` runs tests.
// Skips prod DBs / CI via the same guards as the run scripts (env-resolution.mjs).
loadLocalTestEnv();

function loadLocalTestEnv(): void {
  if (process.env.EASYSUBMIT_SKIP_LOCAL_ENV === "1" || process.env.VERCEL || process.env.CI) {
    return;
  }
  const envPath = path.join(rootDir, ".env.local");
  const fs = require("node:fs") as typeof import("node:fs");
  if (!fs.existsSync(envPath)) return;

  const { parse } = require("dotenv") as typeof import("dotenv");
  const parsed = parse(fs.readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    setupFiles: ["config/vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/**/*.test.ts",
        "lib/**/test-fixtures/**",
        // Generated + infra — not unit-testable per docs/rules/testing.md
        "lib/generated/**",
        "lib/prisma.ts",
        "lib/auth.ts",
        "lib/env.ts",
        "lib/supabase/**",
        "lib/vault/**",
        "lib/hooks/**",
        "lib/**/*-for-user.ts",
        "lib/nominatim.ts",
        "lib/logger.ts",
        "lib/**/*.server.ts",
        "lib/**/*Client.ts",
        "lib/**/persist-*.ts",
        "lib/extension/pipeline-metadata.ts",
        "lib/extension/user-prefs.ts",
        "lib/extension/runtime-config.ts",
        "lib/auth/require-*.ts",
        // Orchestration / browser / extension delivery — not unit-testable here
        "lib/job-tracker/enhance/build-enhance-brief.ts",
        "lib/job-tracker/enhance/run-resume-enhance-pipeline.ts",
        "lib/job-tracker/enhance/apply-baseline-enhance.ts",
        "lib/job-tracker/enhance/apply-enhance-plan.ts",
        "lib/job-tracker/enhance-review-documents.ts",
        "lib/job-tracker/persist-enhanced-resume.ts",
        "lib/job-tracker/pipeline-progress.ts",
        "lib/job-tracker/cover-letter-generator.ts",
        "lib/job-tracker/build-tailor-placeholders.ts",
        "lib/extension/job-service.ts",
        "lib/profile/application-profile-setup.ts",
        "lib/profile/job-resume-overrides.ts",
        "lib/dashboard/tutorial-videos.ts",
        "lib/ai/build-enhance-intelligence-context.ts",
        "lib/ai/build-onboarding-intelligence-context.ts",
        "lib/extension/application-field-memory.ts",
        "lib/extension/deliver-token-to-extension.ts",
        "lib/extension/start-job-apply-from-dashboard.ts",
        "lib/extension/extension-cover-letter.ts",
        "lib/extension/extension-job-preview.ts",
        "lib/extension/extension-resume-form.ts",
        "lib/extension/resume-profiles.ts",
        "lib/profile/job-resume-tailor.ts",
        "lib/profile/resume-profile-core.ts",
        "lib/profile/avatar-storage.ts",
        "lib/profile/avatar-mutations.ts",
        "lib/job-tracker/useCoverLetterGenerator.ts",
        "lib/resume/parseFile.ts",
        "lib/resume/openResume/readPdf.ts",
        // Type-only / re-export barrels
        "lib/job-tracker/types.ts",
        "lib/ai/byok-key-gate.ts",
        "lib/ai/system-quota-gate.ts",
        "lib/onboarding/mapping.ts",
        "lib/profile/application-profile-resolve.ts",
        // Fetch / browser / PDF surfaces — not unit-testable here
        "lib/extension/extension-job-pdf.ts",
        "lib/dashboard/use-workspace-section-expansion.ts",
        "lib/onboarding/workbench-session.ts",
        "lib/resume/ats-universal-sample.ts",
        "lib/extension/auth-request.ts",
        "lib/job-tracker/jd/jd-ai-extractor.ts",
        "lib/profile/studio-form-db.ts",
        "lib/job-tracker/build-deterministic-cover-letter.ts",
        // Pipeline orchestration — Prisma / extension delivery, not unit-testable here
        "lib/job-tracker/enhance/run-job-analysis-track.ts",
        "lib/job-tracker/enhance/run-resume-prep-track.ts",
        "lib/job-tracker/analyze-latest-job.ts",
        "lib/extension/pipeline-run-insight.ts",
        "lib/extension/capture-job.ts",
        "lib/extension/pipeline-debug-list.ts",
        "lib/extension/apply-pipeline.ts",
        "lib/extension/pipeline-tailor.ts",
        "lib/profile/finalizeProfile.ts",
        "lib/job-tracker/ats/onet-service.ts",
        "lib/ai/model-health/refresh-provider-model-health.ts",
        "lib/ai/model-health/resolve-model-candidates.ts",
        "lib/ai/model-health/probe-model-capabilities.ts",
        "lib/job-tracker/enhance/build-light-enhance-brief.ts",
        "lib/job-tracker/pipeline-tracker-view.ts",
      ],
      reportsDirectory: "coverage",
      thresholds: {
        statements: 85,
        branches: 78,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": rootDir,
      "@shared": path.resolve(rootDir, "src/shared"),
    },
  },
});
