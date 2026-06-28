# Sidepanel completion gate

When you change user-visible sidepanel behavior (`extension/src/`, related apply flows, or shared modules they call), do not mark the task complete until all items below are done.

## What counts as user-visible

- Queue, drawer, tabs, settings, onboarding, apply controller UI
- Export/download actions, labels, button order, navigation
- New/removed settings, toggles, or storage keys surfaced in UI
- Error toasts, status pills, or flow gates the user sees

Skip this gate only for: typo/copy-only edits with zero behavior change, or pure visual tweaks that do not alter documented flows.

## Required before done

1. **Docs**
   - Update `docs/ARCHITECTURE.md` — changelog row with date + one-line summary
   - Update `docs/PROJECT_STATE.md` — completed features and/or active work
   - If storage keys or lifecycle change → also `docs/database-schema.md`
   - Finished deliverables → row in `docs/COMPLETED_ITEMS.md`

2. **Tests**
   - Run `npx vitest run --config config/vitest.config.ts` and fix failures
   - Add or extend tests for touched shared logic in `lib/` or `src/shared/`
   - UI-only changes: test pure functions if practical; do not skip tests when logic was added/changed in shared modules

3. **Build**
   - Run `npm run build` and confirm it passes

## Component / E2E gaps

If behavior is React-only and untestable without new harness, note the gap in `docs/ACTION_ITEMS.md` — do not silently omit tests when shared logic exists.
