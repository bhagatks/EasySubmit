# Cursor Prompt 07 — Features Framework

## Status

**✅ IMPLEMENTED** — 2026-06-26

`lib/features/` is live with `enhance` and `subscription` registered.

---

## The Rule

> **Any product feature that depends on a feature flag, app config, user setting, subscription state, quota, or routing decision MUST be registered in the Features Framework. No exceptions.**

**Never do this in a server action or API route:**

```ts
// ❌ reading flags directly
const flags = await getFeatureFlags();
if (!flags.enhanceWithAiResumeProfile) return error;

// ❌ checking subscription inline
if (isSubscribed(user.plan, user.subscriptionStatus)) { ... }

// ❌ calling resolveAiRoute outside the framework
const route = await resolveAiRoute({ ... });

// ❌ reading env vars inline
if (process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED === "false") { ... }
```

**Always do this instead:**

```ts
// ✅
const enhance = await resolveFeature({ feature: "enhance", userId, surface: "job_apply" });
if (!enhance.available) return { success: false, code: enhance.reason };
```

---

## Entry Point

```ts
import { resolveFeature } from "@/lib/features";

const result = await resolveFeature({ feature, userId, surface });
```

One call per feature per request. Pass the resolved object down — do not call `resolveFeature` twice for the same feature in the same request.

---

## Surfaces (FeatureSurface enum)

```ts
type FeatureSurface = "onboarding" | "job_apply" | "resume" | "extension";
```

- `onboarding` — new user setup wizard
- `job_apply` — job tracker → review screen → enhance with JD context
- `resume` — dashboard resume profile studio (no JD)
- `extension` — Chrome extension card

---

## Registered Features

### `enhance`

```ts
const enhance = await resolveFeature({ feature: "enhance", userId, surface });

enhance.available        // boolean — is AI on for this user+surface
enhance.reason           // why it's off: "globally_disabled" | "feature_disabled" |
                         //   "user_disabled" | "no_key" | "pool_down" | "quota_exceeded"
enhance.mode             // "customer" | "system" | null
enhance.vaultKeyId       // string | null — populated when mode === "customer"
enhance.provider         // string | null
enhance.modelId          // string | null
enhance.quota            // { used, limit, unlimited }
enhance.fallbackAvailable // always true — deterministic engine always runs
```

Surface behavior:
- `onboarding` → always `available: false, reason: "user_disabled"` — deterministic engine only
- `job_apply` → full AI path, all gates checked
- `resume` → full AI path, no JD context
- `extension` → full AI path, shares `enhanceWithAiResumeProfile` flag

Gate order (first failing gate wins):
1. `EASYSUBMIT_AI_GLOBALLY_ENABLED` env → `globally_disabled`
2. `enhanceWithAiOnboarding` / `enhanceWithAiResumeProfile` feature flag → `feature_disabled`
3. `user.aiSourcePreference === "disabled"` → `user_disabled`
4. `featureFlags.systemAiEnabled` off → forces customer mode
5. Route resolution (pool health, vault key) → `no_key` | `pool_down`
6. Daily quota (customer mode, non-subscribed only) → `quota_exceeded`

---

### `subscription`

```ts
const sub = await resolveFeature({ feature: "subscription", userId, surface });

sub.plan               // "free" | "weekly" | "monthly" | "yearly"
sub.status             // "active" | "trialing" | "canceled" | "past_due" | null
sub.isSubscribed       // boolean
sub.showUpgradeNudge   // boolean — true on onboarding/job_apply/resume for free users
sub.limits             // { dailyEnhancements: number, unlimited: boolean }
sub.canUpgrade         // boolean — subscriptions.enabled && not subscribed
```

---

## How to Add a New Feature

### 1. Add to `FeatureSurface` if needed — `lib/features/types.ts`

Only if this feature operates on a surface that does not already exist.

### 2. Add resolved type and register in the map — `lib/features/types.ts`

```ts
export type MyFeatureResolution = {
  available: boolean;
  reason?: "feature_disabled" | "...";
  // everything downstream needs — no raw flags or config objects
};

export type FeatureName = "enhance" | "subscription" | "my_feature";

export type FeatureResolutionMap = {
  enhance: EnhanceFeatureResolution;
  subscription: SubscriptionFeatureResolution;
  my_feature: MyFeatureResolution;
};
```

### 3. Write `lib/features/resolve-my-feature.ts`

Rules for the resolver:
- Check gates in order — first failure returns immediately
- Never throw for business-logic failures — return `available: false` with `reason`
- Do not load more data than needed — `index.ts` already fetched the user row
- Never return raw flags, config objects, or Prisma rows in the resolved shape
- Own the surface→flag mapping internally as a `const` map

```ts
const SURFACE_FLAG_MAP = {
  onboarding: "myFeatureOnboarding",
  job_apply:  "myFeatureJobApply",
  ...
} as const satisfies Record<FeatureSurface, keyof FeatureFlagsSnapshot>;
```

### 4. Register in `lib/features/index.ts`

```ts
case "my_feature":
  return resolveMyFeature(user, input.surface) as Promise<FeatureResolutionMap[F]>;
```

### 5. Add feature flag if needed — `src/lib/services/feature-flags-service.ts`

Add to `FEATURE_FLAG_KEYS`, `FEATURE_FLAG_REGISTRY`, and `FeatureFlagsSnapshot`. The resolver reads from the flags snapshot already loaded — do not add a new `getFeatureFlag()` call inside the resolver.

### 6. Write tests — `lib/features/resolve-my-feature.test.ts`

Cover:
- Each gate independently (mock the one dependency it reads)
- Each surface with different behavior
- All `available: false` + `reason` combinations
- Happy path returning a fully populated object

---

## Full Rules Reference

See `docs/features-framework.md` for the complete contract.
