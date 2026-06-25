| Date | Item |
|------|------|
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
