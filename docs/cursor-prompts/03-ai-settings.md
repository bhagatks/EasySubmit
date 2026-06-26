# Cursor Prompt 03 — AI Settings: Enable/Disable Toggle + Global Kill Switch

## Overview

This prompt implements three things:
1. New `"disabled"` value for `aiSourcePreference` — per-user AI off switch
2. Global compliance kill switch via env var `EASYSUBMIT_AI_GLOBALLY_ENABLED`
3. UI changes across AccountSettings, Review Screen, and Extension to reflect AI state

---

## Part A — Data Model & Router

### 1. Add `"disabled"` to `AiSourcePreference` — `src/lib/ai/engine/constants.ts`

Find `AiSourcePreference` type and add `"disabled"`:

```ts
export type AiSourcePreference = "auto" | "customer" | "system" | "disabled";
```

### 2. Add new error variants to router — `src/lib/ai/engine/router.ts`

Add to `AiRouteResolution`:

```ts
| { error: "ai_globally_disabled" }
| { error: "ai_disabled" }
```

At the very top of `resolveAiRoute()`, before any other logic:

```ts
if (process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED === "false") {
  return { error: "ai_globally_disabled" };
}
if (input.aiSourcePreference === "disabled") {
  return { error: "ai_disabled" };
}
```

Simplify `resolveEffectiveAiSource()` — remove the `"system"` / `"customer"` explicit preference
branches (they are no longer settable from UI). Auto-route by vault key presence:

```ts
export function resolveEffectiveAiSource(
  preference: AiSourcePreference,
  hasVaultKey: boolean,
  aiEngine: AiEngineConfig = AI_ENGINE_DEFAULTS,
  forceSystem = false,
): AiRouteMode {
  if (!isSystemAiEnabled(aiEngine)) return "customer";
  if (forceSystem) return "system";
  // "disabled" is handled before this function is called — never reaches here
  return hasVaultKey ? "customer" : "system";
}
```

### 3. Handle new errors in enhance action — `lib/ai/enhance-resume-for-user.ts`

Extract the deterministic fallback block into a named helper (see Prompt 04). Then add error
handling for the two new variants alongside the existing ones (around line 236):

```ts
if (route.error === "ai_globally_disabled" || route.error === "ai_disabled") {
  return runDeterministicEnhance(resumeId, jobDescription);
}
```

Both disabled states route silently to deterministic — no error is surfaced to the user.

Add `aiDisabled?: boolean` to the success response type in `src/lib/ai/engine/run-enhance.ts`:

```ts
export type RunEnhanceSuccess = {
  // ... existing fields ...
  aiDisabled?: boolean;
};
```

Set `aiDisabled: true` when the route error was `"ai_disabled"` (not globally disabled — that is
an ops concern and should not be surfaced differently to the user).

### 4. Update router tests — `src/lib/ai/engine/router.test.ts`

Add test cases:
- `EASYSUBMIT_AI_GLOBALLY_ENABLED=false` → returns `{ error: "ai_globally_disabled" }`
- `aiSourcePreference: "disabled"` → returns `{ error: "ai_disabled" }`

### 5. Prisma: change default — `prisma/schema.prisma`

Line 32 (approximately):

```prisma
aiSourcePreference String @default("disabled")
```

Change from `"auto"` to `"disabled"` so new users start with AI off.

Run migration: `npx prisma migrate dev --name ai-preference-disabled-default`

---

## Part B — AccountSettings UI

File: `components/dashboard/AccountSettings.tsx`

### Changes

**Section title** (line ~489): `"AI Keys"` → `"AI"`

**Remove entirely:**
- `AI_SOURCE_OPTIONS` array (lines ~70–74)
- `AI_SOURCE_LABELS` object (lines ~81–85)
- `aiSource` state variable and its `useEffect`
- `handleAiSourceChange` handler
- `appliedAiSourceParam` ref related to aiSource
- The `SegmentedControl` component rendering AI source options

**Add:**

```ts
const [aiEnabled, setAiEnabled] = useState(
  initial.aiSourcePreference !== "disabled"
);

async function handleAiToggle(checked: boolean) {
  setAiEnabled(checked);
  await updateAiSourcePreference(checked ? "auto" : "disabled");
}
```

**Replace the segmented control with a Switch row:**

```tsx
<div className="flex items-center justify-between gap-4">
  <div>
    <p className="text-sm font-medium">AI Enhancement</p>
    <p className="text-xs text-muted-foreground">
      {aiEnabled
        ? engineHot
          ? "Your key active"
          : "System AI · uses daily quota"
        : "AI disabled — enhance uses rules engine"}
    </p>
  </div>
  <Switch checked={aiEnabled} onCheckedChange={handleAiToggle} />
</div>
```

**Wrap key management block** (vault key entry, provider selector) in `{aiEnabled && (...)}` so
it is hidden when AI is disabled.

---

## Part C — Review Screen Panels

Files: `components/dashboard/ReviewResumePanel.tsx`, `components/dashboard/review/ReviewCoverPanel.tsx`

### Changes

Add `aiEnabled: boolean` prop to both components.

In the `DocumentToolbarAction` for `"enhance"`, change label and title based on `aiEnabled`:

```ts
{
  id: "enhance",
  label: aiEnabled ? "Enhance with AI" : "Enhance",
  title: aiEnabled
    ? (entry.hasTailoredResume ? undefined : "Tailor a resume for this job first")
    : "Enable AI in Settings for smarter enhancements",
  // ... rest unchanged
}
```

The button remains enabled regardless — when AI is off it silently routes to deterministic and
the amber `EnhanceFeedbackCard` ("Enhanced without AI (rules engine)") is shown as before.

**Where `aiEnabled` comes from:** The parent component that renders the Review screen must read
`aiSourcePreference` from the session or a server fetch and pass `aiEnabled` as:

```ts
aiEnabled={session.user.aiSourcePreference !== "disabled" &&
            process.env.NEXT_PUBLIC_AI_GLOBALLY_ENABLED !== "false"}
```

Add `NEXT_PUBLIC_AI_GLOBALLY_ENABLED` to `.env` (mirrors `EASYSUBMIT_AI_GLOBALLY_ENABLED` for
client-side reads) — set to `"false"` when the kill switch is active.

---

## Part D — Extension

Files: `extension/src/background/index.ts`, `extension/src/content/card-ui.ts`

### 1. Background service worker — `extension/src/background/index.ts`

On init and on user sync, fetch `aiSourcePreference` from the dashboard API:

```ts
const response = await fetch(`${dashboardOrigin}/api/user/ai-preference`);
const { aiSourcePreference } = await response.json();
const aiEnabled = aiSourcePreference !== "disabled";
```

Store `aiEnabled` in `chrome.storage.local` alongside other user settings.

If the fetch fails, default `aiEnabled = true` (fail open — do not silently degrade the user's
experience without their knowledge).

### 2. Card state — wherever card state is constructed

Include `aiEnabled: boolean` in the card payload sent to the content script.

### 3. Card UI — `extension/src/content/card-ui.ts`

Add `aiEnabled: boolean` to the card input type (near `enhanceEnabled`, line ~938).

In the enhance button render, adjust label and tooltip:

```ts
label: input.aiEnabled ? "Enhance with AI" : "Enhance",
title: input.aiEnabled
  ? undefined
  : "Enable AI in Settings for smarter enhancements",
```

The `enhanceEnabled` flag stays as-is (`!editing && state === "ready"`). `aiEnabled` only
affects label and tooltip — the button remains clickable in both states.

### 4. Create API route — `app/api/user/ai-preference/route.ts`

Simple authenticated GET that returns `{ aiSourcePreference: string }` from the session user.
Use the existing `requireDashboardSession` pattern from `lib/auth/require-dashboard-session.ts`.

---

## Onboarding

**No changes.** The AI enhance button in onboarding is already gated behind
`fetchEnhanceOnboardingAvailable()`. New users will have `aiSourcePreference = "disabled"` by
default so the button won't show. No onboarding code is touched.

---

## Files to Edit

| File | Change |
|---|---|
| `src/lib/ai/engine/constants.ts` | Add `"disabled"` to `AiSourcePreference` |
| `src/lib/ai/engine/router.ts` | Add `ai_globally_disabled` / `ai_disabled` errors, simplify source resolver |
| `src/lib/ai/engine/run-enhance.ts` | Add `aiDisabled?: boolean` to success type |
| `src/lib/ai/engine/router.test.ts` | Add tests for both disabled variants |
| `lib/ai/enhance-resume-for-user.ts` | Handle new error variants → route to deterministic |
| `prisma/schema.prisma` | `aiSourcePreference @default("disabled")` + migration |
| `components/dashboard/AccountSettings.tsx` | Remove segmented control, add Enable/Disable toggle |
| `components/dashboard/ReviewResumePanel.tsx` | Add `aiEnabled` prop, conditional button label/tooltip |
| `components/dashboard/review/ReviewCoverPanel.tsx` | Add `aiEnabled` prop, conditional button label/tooltip |
| `extension/src/background/index.ts` | Fetch `aiSourcePreference` on init/sync |
| `extension/src/content/card-ui.ts` | Add `aiEnabled` to card input, conditional label/tooltip |
| `app/api/user/ai-preference/route.ts` | New API route — returns `aiSourcePreference` |

## Files NOT to touch

- `app/onboarding/page.tsx` — already gated by feature flag, no change
- `components/onboarding/hub/RefineryPanel.tsx` — no change
- `src/lib/services/ai-engine-config.ts` — no change

---

## Definition of Done

- [ ] `aiSourcePreference = "disabled"` routes both enhance paths to deterministic silently
- [ ] `EASYSUBMIT_AI_GLOBALLY_ENABLED=false` kills AI for all users, routes to deterministic
- [ ] AccountSettings shows Enable/Disable toggle, no segmented control
- [ ] Key management block hidden when AI disabled
- [ ] Review panels show "Enhance" label + hover hint when AI disabled
- [ ] Extension card shows "Enhance" label + tooltip when AI disabled
- [ ] New users default to AI disabled (prisma migration applied)
- [ ] Router tests cover both disabled variants
- [ ] `npx tsc --noEmit` — zero new errors
- [ ] `npm run build` passes
