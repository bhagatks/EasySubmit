| Date | Item |
|------|------|
| 2026-07-06 | **Enhance AI closeout** — custom tier routing fix, kernel rate-limit delay, OpenRouter JSON mode, JD extract note; AIHubMix live QA pass |
| 2026-07-06 | **Enhance AI mission (kernel + failure UX v1)** — `lib/ai/call-kernel/` (classify → decide → retry/escalate loop, `aiCallLedger`, BYOK→slot 0→slot 1 DeepSeek); parse validation part of call (HTTP 200 + bad JSON escalates, no false API success); `resolveEnhanceOutcome()` warnings + fix actions persisted (`enhanceMeta`, `pipelineAiWarning`); surfaces: tracker row ⚠, Review header + `AiOutcomeBanner`, extension card line + session alert, Studio dialog alert; `enhance:trace:prod` prints ledger first; spec `docs/enhance-ai-failure-ux.md` |
| 2026-07-06 | **Custom Endpoint BYOK model ID** — optional manual Model ID on Ignition Gate / Settings vault (AIHubMix-style gateways); custom chat-probe uses user model and returns it (never bundled gpt-4o*); discovery filters pass gateway IDs like `coding-glm-5.1-free`; custom provider skips OpenAI default fallback |
| 2026-07-06 | **O*NET prod vocabulary** — `ONET_API_KEY` in Vercel Production; live Apply run verified `pre_role_vocab` step (`source: api`, not `fallback`) |
| 2026-07-06 | **Prod deploy** — `www.easysubmit.ai` on `cd0cfd5`+ (job URL import, Application answers Settings, three-level AI, 4 pending migrations applied) |
| 2026-07-06 | **Dashboard job URL import** — Add job modal: optional URL + **Import from URL**; manual role/company/JD only → tailor stops at **Resume ready** (no Apply assist without posting URL); `lib/job-tracker/scrape-job-posting-url.ts` |
| 2026-07-06 | **Field Memory Settings UI** — `/dashboard/settings` → Application answers (list, search, edit, delete); `app/actions/application-answers.ts`; denylist filter on list |
| 2026-07-06 | **Extension polish 3.2–3.3** — force-capture loading hint + manual header copy; removed legacy one-click toggle from Settings (DB column retained) |
| 2026-07-06 | **Enhance QA Case 001 matrix** — automated gate **7/7** + pipeline **5/5** PASS on dev pool (`enhance-qa-switch-matrix.ts`); manual harness sign-off still open |
| 2026-07-05 | **Readiness polish** — summary 4-sentence word trim, injectable keyword merge, skills headroom, light-path grounding always on |
| 2026-07-05 | **Extension GH JD quality** — boards-api preferred over DOM for embedded + native GH URLs; page intercept cannot downgrade API JD |
| 2026-07-05 | **Job capture dedupe** — `saveJobTrackerEntry` archives duplicate active rows for same URL hash |
| 2026-07-05 | **E2E readiness 90+ batch** — keyword merge, summary normalizer, extension scrape fixes, bulk tracker select, `scripts/batch-ats-readiness.ts` |
| 2026-07-05 | Dev dashboard **500 / Failed to fetch fix** — webpack ignores broken `rake-js` `.js.map` files in `next.config.mjs`; clears client import chain `AtsPanel → readiness → jd-extractor → rake-js` |
| 2026-07-05 | Resume rules **v2 all page modes** — profiles for 1/3/4/4+ (4+ unlimited + ATS warning), profile-aware validation/repair/readiness/enhance prompts, AtsPanel page mode + skillsText + 4+ banner, tailored preview `skillsText` |
| 2026-07-05 | Resume rules **v2 complete wiring** — `resumeRulesV2` feature flag (default on), page mode selector in studio, v2 studio lint, features framework resolver, enhance session meta `resumeRulesVersion`, testing guide `docs/resume/RULES-V2-TESTING.md` |
| 2026-07-05 | Resume rules **v2 wiring** — env opt-in (`RESUME_RULES_V2_ENABLED` / `NEXT_PUBLIC_RESUME_RULES_V2`): pipeline repair + readiness delta, enhance brief + AI pass v2 prompts, AtsPanel scorer, export no silent bullet cap |
| 2026-07-04 | Resume rules **v2** (isolated) — `lib/resume/v2/` 2-page profile, validation, DeepSeek prompt builder, **`computeResumeReadinessV2()`** (four pillars scored with v2 rules, filters v1 §8 bullet-cap warnings); v1 pipeline/export unchanged; Fidelity flash benchmark `.tmp-debug/chat-parity-v2-2page-result.json` |
| 2026-07-04 | Fork/join enhance — capture starts job track ∥ resume track (`pipeline-track-coordinator`); light skills merge; slim experience fact ledger; light brief for resume AI; full brief/baseline only on AI fail; `/dashboard/pipeline` QA groups by architecture track |
| 2026-07-03 | Max-ATS enhance default — `buildAtsOptimizationSpec()`, single AI pass, skills-only baseline when AI runs, full deterministic fallback + warning UX, cross-domain 6-skill cap removed, title+company path (extension tailor + Review), Review ATS delta cap removed; `partialEnhance` dropped |
| 2026-07-01 | Extension CI CRX pipeline — `pack-extension-crx.mjs`, `upload-extension-cws.mjs`, `deploy.yml` artifacts + Verified CRX publish |
| 2026-07-01 | Extension build docs — `docs/EXTENSION_BUILD.md`; fixed outputs `dist/extension-dev/` (localhost) vs `dist/extension/` (prod / CWS) |
| 2026-06-29 | Prod PostHog fix — static `NEXT_PUBLIC_*` in `getAnalyticsConfig` (client inlining); Vercel analytics env sync scripts; `vercel-build` validate gate; `npm run prod:verify-posthog` |
| 2026-07-02 | Docs sync — env domains in ENV, DEPLOYMENT, DEVELOPMENT_WORKFLOW, TROUBLESHOOTING, PROD_CUTOVER, ACTION_ITEMS; RLS migration noted |
| 2026-07-02 | Env domains — PostHog admin isolated from DATABASE_URL (`buildPostHogAdminEnv`, `docs/rules/env-domains.md`); `prisma.config.ts` never loads `.env.local` |
| 2026-06-29 | `run easy` / `run easy prod` pipeline cleanup — numbered steps, `run easy fast` / `run easy prod fast`, removed PostHog journey from default paths; docs in `ENV.md`, `DEVELOPMENT_WORKFLOW.md`, `DEPLOYMENT_TROUBLESHOOTING.md` |
| 2026-06-29 | Prod deploy hardening — `prisma.config.ts` drops `directUrl`; `resolveMigrateEnv`; web live at `www.easysubmit.ai` |
| 2026-06-28 | Env + deploy pipeline — command-specific injection (`scripts/run.mjs`, `env-lib.mjs`, `prisma-migrate-deploy.mjs`); no `.env` file swapping; `docs/DEVELOPMENT_WORKFLOW.md` + `docs/DEPLOYMENT.md`; Chrome extension CI `.github/workflows/deploy.yml` |
| 2026-06-27 | Extension popup Part 2 — launcher UI + `GET_JOB_STATS` API + one-click toggle removed |
| 2026-06-27 | JD AI observability — `callEnhanceObjectModel` writes `api_call_logs` (`ai.enhance.generate_object`); JD extract pre-checks system/customer quota; JD calls count toward `aiCallsToday`; `app_config.aiEngine.system.jdExtractionModelId` for system pool (BYOK keeps vaulted model) |
| 2026-06-27 | Extension install prompt — opt-in `app_config.extensionInstallPrompt` triggers (`dashboardVisit`, `tabFocusReturn`, `periodicRefresh`); session dismiss on Skip; `?setup=1` → tutorials on all exits; `lib/dashboard/extension-install-prompt-triggers.ts` + tests |
| 2026-06-27 | North-star resume enhance — JDSkillsFramework (deterministic + optional ESCO), 3-phase pipeline (`runResumeEnhancePipeline`), soft AI gates (baseline always succeeds), grouped skills, coverage panel, extension warning UX, analytics + pipeline logs; migration `20260627120000_north_star_jd_skills_enhance_meta` |
| 2026-06-27 | Product analytics Option A — PostHog events (login, onboarding, review, enhance, extension, BYOK), Pino logging, `docs/analytics-option-a.md`, dashboard setup script |
| 2026-06-25 | Resume export spacing overhaul — `resume-style.ts` spacing constants updated (betweenSections, afterSectionRule, afterEntryHead, afterEntrySub, bulletGap, betweenEntries); DOCX line height 240→276 DXA + bodyParagraph uses constant; HTML preview fully wired to SPACING constants — all three renderers (PDF/DOCX/HTML) now share single source of truth |
| 2026-06-25 | Extension state map overhaul — 5-state journey (State 0–4) replacing old 4-state model; `autoSuggestCta` added to BRAND; `journey-display.ts` states corrected (CAPTURED hides CTA, RESUME_READY/READY_TO_APPLY show "Apply with Auto Suggest", APPLIED/archived show no status label); `showUpdateResume` removed entirely; `is-live` shell animation stops at APPLIED |
| 2026-06-25 | Review Screen — "Apply" tab removed from all surfaces (type, panels array, labels map, default panel logic, component, render line); READY_TO_APPLY now defaults to "resume" tab |
| 2026-06-25 | Extension card detail UX — Job Info / Resume / Cover Letter summary labels; Edit in Resume Studio → Review Screen tab; cover full inline edit + resume lite fields (lazy fetch on Edit); extension cover-letter + resume-form API routes |
| 2026-06-25 | Extension single-card layout — expandable job/resume/cover views, preview API, dashboard header deeplink |
| 2026-06-25 | Extension pipeline hardening — re-capture resets to CAPTURED, mark-applied only from READY_TO_APPLY, content script teardown via window cleanup, AI health BYOK log query fix (`aiMode: customer`) |
| 2026-06-25 | Global AI health alert (dashboard header + extension card icon) + Settings split into AI Keys / General |
| 2026-06-23 | Extension on-demand PDFs + file injector: resume/cover-letter PDF routes, `file-inject.ts`, Workday upload wiring |
| 2026-06-23 | Application profile Phases 6–8: user-prefs PATCH JSONB merge, extension setup Screens 1–2, field-resolution `application_profile` step, journey display button states |
| 2026-06-23 | Journey sync (extension ↔ app): State 0 manual capture + loading hydration, Stage 2 two-card assist, Realtime + poll sync, `?es_open=assist`, `MARK_APPLIED`, Layer B apply gate — `docs/SYNC_ARCHITECTURE.md` |
| 2026-06-22 | ATS score calibration fixes: keyword-gap fallback to ≥1 threshold for short JDs (<5 repeat keywords), bullet quality reweighted 70/30 verb/metric, compliance penalty 3pts/warning (was 5); `review-documents.ts` variant fixed to `"dashboard"` |
| 2026-06-22 | Smart Resume Engine: `job-intelligence.ts` (JobIntelligence layer), `onet-service.ts` (O*NET vocabulary), `deterministic-enhancer.ts` (zero-token fallback), `platform-rules.ts` (9 ATS platforms), two-pass AI prompts with intelligence block, `EnhanceFeedbackCard` before/after ATS delta UI |
| 2026-06-22 | Review Screen ATS Analysis + ATS-quality exports: `resume-content-model` shared by HTML/PDF/Word/robot view; `resume-docx` + `resume-pdf`; readiness score panel; unit tests |
| 2026-06-22 | Review Screen cover letter: AI enhance (`enhanceCoverLetterForUserId` + `runCoverLetterEnhance`), pipeline tailor seeds draft + LaTeX on `job_resume_tailors`, save syncs LaTeX, Word export without toolbar spacer; unit tests |
| 2026-06-22 | Review Screen Resume + Cover document tabs: toolbar exports (PDF/Word), Enhance, LaTeX fullscreen editor, cover inline edit, `job_resume_tailors` document columns + unit tests |
| 2026-06-22 | Workday pipeline Phase C stub + D polish: autofill-complete API, extension autofill runner, card polling, popup one-click toggle, kanban Studio link |
| 2026-06-22 | Workday one-click pipeline Phase B: `runApplyPipeline` + `runPipelineTailor` (copy profile, Enhance AI, persist) → `RESUME_READY`; partial failure handling + tests |
| 2026-06-20 | Root layout: resume fixtures → `assets/resume/`, rules → `docs/resume/RULES.md`, tooling config → `config/`, client stores/hooks/types → `src/` |
| 2026-06-20 | Vercel deploy pipeline (`run easy prod`); removed local prod env duplication |
| 2026-06-20 | Schema consolidation: `profiles.content` JSONB + `calibrationScore`; dropped `architectures` and child resume tables; removed unused profile columns |
| 2026-06-17 | NextAuth (Google + LinkedIn), middleware, typed env, `/login` UI |
| 2026-06-17 | Onboarding flow shell — 4-phase progress, asymmetric layout, AnimatePresence |
| 2026-06-17 | `/onboarding/step-4` ResumeMapping scanner + wizard redirect on resume upload |
| 2026-06-17 | Docs refresh (ARCHITECTURE, FLOW, PROJECT_STATE, ACTION_ITEMS); build fixes |
| 2026-06-15 | Onboarding steps 2–3 + wizard transitions + Zustand location store |
| 2026-06-15 | Onboarding steps 4–6: resume upload, parsing simulation, analysis complete |
| 2026-06-15 | Onboarding steps 7–11: experience, roles, salary, matches, referral survey |
| 2026-06-15 | Step 12, Supabase signup, finalizeProfile, dashboard redirect |
