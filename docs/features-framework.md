# Features Framework — Rules & Contracts

**Location:** `lib/features/`  
**Entry point:** `lib/features/index.ts` → `resolveFeature()`

---

## The Rule

> **Any product feature that depends on a feature flag, app config, user setting, subscription state, quota, or routing decision MUST be registered in this framework. No exceptions.**

Calling `getFeatureFlags()`, `getAppConfig()`, `isSubscribed()`, `resolveAiRoute()`, or reading `user.plan / user.vaultKeyId / user.aiSourcePreference` directly inside a server action or API route is a violation. All of that belongs inside a resolver in `lib/features/`.

---

## What "a feature" means

A feature is any capability that can be:
- turned on or off (flag, config, env var)
- scoped to a surface (onboarding, job_apply, resume, extension)
- affected by the user's plan, quota, or settings

If two of these are true for something you are building, it is a feature and it belongs here.

---

## Registered features

| Feature | Resolver | Surfaces |
|---|---|---|
| `enhance` | `resolve-enhance.ts` | onboarding · job_apply · resume · extension |
| `subscription` | `resolve-subscription.ts` | onboarding · job_apply · resume · extension |
| `resumeRulesV2` | `resolve-resume-rules-v2.ts` | onboarding · job_apply · resume · extension |

Add a row here when registering a new feature.

---

## How to add a new feature

### 1. Define the surface(s)

`FeatureSurface` in `types.ts` is the canonical enum. If your feature needs a surface that does not exist yet, add it there first. Do not invent local string literals.

### 2. Add the resolved type to `types.ts`

```ts
export type MyFeatureResolution = {
  available: boolean;
  reason?: "feature_disabled" | "...";
  // everything downstream needs — no raw flags, no config objects
};

// Add to the registry map:
export type FeatureResolutionMap = {
  enhance: EnhanceFeatureResolution;
  subscription: SubscriptionFeatureResolution;
  my_feature: MyFeatureResolution;   // ← add here
};
```

### 3. Add the feature name to `FeatureName`

```ts
export type FeatureName = "enhance" | "subscription" | "my_feature";
```

### 4. Write `resolve-my-feature.ts`

- Load only what you need — one DB read at most (the caller in `index.ts` already fetched the user row)
- Check gates in order: global env → feature flag → user setting → quota/limits
- First failing gate returns immediately — never accumulate errors
- Return the fully resolved object — no raw flags or config objects leak out
- Never throw for business-logic failures — model them as `available: false` with a `reason`

### 5. Register in `index.ts`

```ts
case "my_feature":
  return resolveMyFeature(user, input.surface) as Promise<FeatureResolutionMap[F]>;
```

### 6. Add a feature flag to `feature-flags-service.ts` if needed

If your feature needs a DB toggle, add it to `FEATURE_FLAG_KEYS` and `FEATURE_FLAG_REGISTRY`. The framework reads from `getFeatureFlags()` — do not add a new `getFeatureFlag()` call inside your resolver, reuse the snapshot already loaded.

---

## Surface → flag mapping rule

Every feature owns its surface→flag mapping internally inside its resolver file. This mapping must never live in:
- Server actions
- API route handlers
- UI components
- Any file outside `lib/features/`

```ts
// ✅ correct — inside resolve-enhance.ts
const SURFACE_FLAG_MAP = {
  onboarding: "enhanceWithAiOnboarding",
  job_apply:  "enhanceWithAiResumeProfile",
  ...
} as const satisfies Record<FeatureSurface, keyof FeatureFlagsSnapshot>;

// ❌ wrong — in a server action
if (variant === "onboarding" ? flags.enhanceWithAiOnboarding : flags.enhanceWithAiResumeProfile) { ... }
```

---

## What the resolved object must and must not contain

**Must contain:**
- `available: boolean` — the single answer callers need most
- `reason` — why it is off, for UI messaging and logging
- Everything downstream needs to operate — mode, keys, limits, nudge flags

**Must not contain:**
- Raw feature flag booleans (`enhanceWithAiOnboarding: true`)
- Raw config objects (`AiEngineConfig`, `SubscriptionConfig`)
- Prisma model rows
- Any value that requires the caller to re-derive something

The resolved object is the contract. If a caller needs to check a raw flag to make a decision, the resolver is incomplete.

---

## Calling the framework

```ts
import { resolveFeature } from "@/lib/features";

// In a server action or API route:
const enhance = await resolveFeature({ feature: "enhance", userId, surface: "job_apply" });

if (!enhance.available) {
  return { success: false, code: enhance.reason };
}

// enhance.mode, enhance.vaultKeyId, enhance.quota are all ready to use
```

One call per feature per request. Do not call `resolveFeature` more than once for the same feature in the same request — pass the resolved object down.

---

## What NOT to do

```ts
// ❌ reading flags directly in a server action
const flags = await getFeatureFlags();
if (!flags.enhanceWithAiResumeProfile) return error;

// ❌ checking subscription inside business logic
if (isSubscribed(user.plan, user.subscriptionStatus)) { ... }

// ❌ calling resolveAiRoute outside the framework
const route = await resolveAiRoute({ ... });

// ❌ checking env vars outside the framework
if (process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED === "false") { ... }

// ❌ two resolveFeature calls for the same feature
const e1 = await resolveFeature({ feature: "enhance", userId, surface });
// ... later in same function ...
const e2 = await resolveFeature({ feature: "enhance", userId, surface }); // redundant DB hit
```

---

## Testing

Every resolver must have a unit test in `lib/features/`. Tests must cover:
- Each gate independently (mock the dependency that gate reads)
- Each surface that has different behavior
- The `available: false` + `reason` shape for every failure mode
- The happy path returning a fully populated object

Run with:
```bash
npx vitest run --config config/vitest.config.ts lib/features/
```
