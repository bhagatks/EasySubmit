"use client";

import { JetBrains_Mono } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  KeyRound,
  Rocket,
  Sparkles,
  Terminal,
  Unlock,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { fetchDataRefreshConfig } from "@/app/actions/config";
import { trackScreenOverlay } from "@/src/shared/analytics";
import { Button } from "@/components/ui/button";
import { GlossyFullscreenShell } from "@/components/ui/glossy-fullscreen-shell";
import { getWorkbenchPhase, workbenchPhaseHeader } from "@/lib/onboarding/workbenchPhases";
import { cn } from "@/lib/utils";
import { ProviderFuelSelect } from "@/src/components/shared/ProviderFuelSelect";
import { ClipboardButton } from "@/src/components/shared/ClipboardButton";
import {
  isDiscoveryCacheFresh,
  readLastDiscoveryTimestamp,
} from "@/src/lib/ai/discovery-timing";
import { type HandshakeProvider } from "@/src/lib/config/career-grade-models";
import {
  getProviderRegistryEntry,
  SYSTEM_DEFAULTS,
} from "@/src/lib/config/app.config";
import { providerRequiresCustomBaseUrl } from "@/src/lib/config/provider-compat";
import { getCachedModelsForProvider } from "@/src/lib/config/model-cache";
import {
  DATA_REFRESH_SAFETY_DEFAULT,
  type RefreshIntervalMinutes,
} from "@/src/lib/services/config-shared";
import {
  getIgnitionProviderLabel,
  selectHandshakeValidated,
  useIgnitionStore,
} from "@/src/stores/use-ignition-store";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const NAVY_CANVAS = "oklch(0.16 0.04 268)";
const NAVY_SURFACE = "oklch(0.12 0.03 268)";
const NAVY_DEEP = "oklch(0.11 0.028 268)";
const PRIMARY = "oklch(0.62 0.21 265)";
const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";
const TEXT = "oklch(0.98 0.01 268)";

type TerminalLine = {
  id: string;
  prefix: string;
  message: string;
  tone: "muted" | "primary" | "mint" | "error";
};

export type IgnitionGateProps = {
  monoClass?: string;
  variant?: "launch" | "protect" | "manage";
  /** Full-screen cinematic shell with backdrop blur (KeyProtector / dashboard gate). */
  fullScreen?: boolean;
  lockReason?: string | null;
  onLaunch?: () => void;
  onResume?: () => void;
  isLaunching?: boolean;
  apiKeyInputId?: string;
  /** Pre-select provider (dashboard key edit / add). */
  initialProvider?: HandshakeProvider;
  /** Lock provider dropdown when editing an existing vaulted key. */
  lockProvider?: boolean;
  /** When adding a second provider, allow opting out of switching the active BYOK pointer. */
  setAsActiveOnSave?: boolean;
  /** Called after successful vault + model discovery in manage mode. */
  onKeySaved?: () => void;
  /** Called when `igniteEngineVault` returns success (handshake + vault complete). */
  onVaultSuccess?: (payload: {
    provider: HandshakeProvider;
    providerLabel: string;
  }) => void;
  /** When true, marks analytics `byok_key_saved.is_first_key`. */
  isFirstKey?: boolean;
  manageTitle?: string;
  manageDescription?: string;
  /** Manage-mode primary action label (default: Validate & Vault Key). */
  manageSubmitLabel?: string;
  /** Manage-mode confirm label after discovery (default: Save Key). */
  manageConfirmLabel?: string;
  /** Mint glow styling for manage-mode action buttons. */
  manageIgniteGlow?: boolean;
  /** Hide manage-mode title block when embedded in a parent shell (e.g. Settings modal). */
  hideManageHeader?: boolean;
};

function toneColor(tone: TerminalLine["tone"]): string {
  switch (tone) {
    case "mint":
      return MINT;
    case "primary":
      return PRIMARY;
    case "error":
      return "oklch(0.65 0.18 25)";
    default:
      return MUTED;
  }
}

function InputBorderScan({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.62 0.21 265 / 0.35), oklch(0.82 0.16 165 / 0.55), oklch(0.62 0.21 265 / 0.35), transparent)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[1px] rounded-[11px]"
        style={{ backgroundColor: "oklch(0.14 0.03 268)" }}
      />
      <motion.div
        className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.82_0.16_165)] to-transparent"
        animate={{ top: ["0%", "100%", "0%"], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function DiscoveryListPulse({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-xl"
      animate={{
        boxShadow: [
          "inset 0 0 0 1px oklch(0.82 0.16 165 / 0.2)",
          "inset 0 0 24px oklch(0.82 0.16 165 / 0.35)",
          "inset 0 0 0 1px oklch(0.82 0.16 165 / 0.2)",
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function IgnitionGate({
  monoClass = jetbrainsMono.className,
  variant = "launch",
  fullScreen = false,
  lockReason = null,
  onLaunch,
  onResume,
  isLaunching = false,
  apiKeyInputId = "ignition-api-key",
  initialProvider,
  lockProvider = false,
  setAsActiveOnSave = true,
  isFirstKey = false,
  onKeySaved,
  onVaultSuccess,
  manageTitle,
  manageDescription,
  manageSubmitLabel,
  manageConfirmLabel,
  manageIgniteGlow = false,
  hideManageHeader = false,
}: IgnitionGateProps) {
  const isProtectMode = variant === "protect";
  const isManageMode = variant === "manage";
  const [provider, setProviderState] = useState<HandshakeProvider>(
    initialProvider ?? SYSTEM_DEFAULTS.targetAiProvider,
  );
  const [apiKey, setApiKey] = useState("");
  const [customEndpointUrl, setCustomEndpointUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [makeActive, setMakeActive] = useState(setAsActiveOnSave);
  const [refreshIntervalMinutes, setRefreshIntervalMinutes] = useState<RefreshIntervalMinutes>(
    DATA_REFRESH_SAFETY_DEFAULT.interval,
  );
  const [usedCachedDiscovery, setUsedCachedDiscovery] = useState(false);
  const screenLoggedRef = useRef(false);

  useEffect(() => {
    if (screenLoggedRef.current) return;
    screenLoggedRef.current = true;
    trackScreenOverlay("ignition_gate", {
      flags: {
        variant,
        lockProvider,
        isFirstKey,
        isProtectMode,
        isManageMode,
      },
    });
  }, [variant, lockProvider, isFirstKey, isProtectMode, isManageMode]);

  const {
    discoveryStatus,
    discoveryError,
    availableModels,
    activeModel,
    recommendedModel,
    provider: storedProvider,
    setProvider,
    setActiveModel,
    runDiscovery,
    restoreDiscoveryFromCache,
    isIgnitionComplete,
  } = useIgnitionStore();

  const handshakeValidated = useIgnitionStore(selectHandshakeValidated);
  const providerLabel = getIgnitionProviderLabel(storedProvider);
  const isHandshaking = discoveryStatus === "handshaking";
  const showConfigPhase =
    !isManageMode && handshakeValidated && discoveryStatus === "ready";
  const canLaunch =
    variant === "launch" && !isProtectMode && isIgnitionComplete() && !isLaunching;
  const canResume = isProtectMode && isIgnitionComplete() && !isLaunching;

  // Sync when parent sets initialProvider (settings add/edit modal). Do not re-run when
  // storedProvider changes — handleProviderChange updates the store and would snap back.
  useEffect(() => {
    if (!initialProvider) return;
    setProviderState(initialProvider);
    setProvider(initialProvider);
  }, [initialProvider, setProvider]);

  useEffect(() => {
    if (initialProvider || !storedProvider) return;
    setProviderState(storedProvider as HandshakeProvider);
  }, [initialProvider, storedProvider]);

  useEffect(() => {
    setMakeActive(setAsActiveOnSave);
  }, [setAsActiveOnSave]);

  useEffect(() => {
    let cancelled = false;

    void fetchDataRefreshConfig()
      .then((config) => {
        if (!cancelled) {
          setRefreshIntervalMinutes(config.interval);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRefreshIntervalMinutes(DATA_REFRESH_SAFETY_DEFAULT.interval);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const terminalLines = useMemo((): TerminalLine[] => {
    const lines: TerminalLine[] = [
      {
        id: "boot",
        prefix: "[SYS]",
        message: isProtectMode
          ? "Engine lock engaged — session preserved in background."
          : "Ignition Gate online — awaiting BYOK credentials.",
        tone: "muted",
      },
    ];

    if (isProtectMode && lockReason) {
      lines.push({
        id: "lock",
        prefix: "[LOCK]",
        message: lockReason,
        tone: "error",
      });
    }

    if (isHandshaking) {
      lines.push(
        {
          id: "auth",
          prefix: "[AUTH]",
          message: `Handshaking with ${getProviderRegistryEntry(provider).label}…`,
          tone: "primary",
        },
        {
          id: "discover",
          prefix: "[DISCOVERY]",
          message: "Fetching career-grade model catalog…",
          tone: "primary",
        },
      );
    }

    if (showConfigPhase) {
      lines.push({
        id: "ok",
        prefix: "[OK]",
        message: usedCachedDiscovery
          ? `Cached catalog restored — ${availableModels.length} career-grade models ready (handshake skipped).`
          : `Handshake validated — ${availableModels.length} career-grade models discovered.`,
        tone: "mint",
      });
    }

    if (discoveryStatus === "error" && discoveryError) {
      lines.push({
        id: "err",
        prefix: "[ERR]",
        message: discoveryError,
        tone: "error",
      });
    }

    return lines;
  }, [
    availableModels.length,
    discoveryError,
    discoveryStatus,
    isHandshaking,
    isProtectMode,
    lockReason,
    provider,
    showConfigPhase,
    usedCachedDiscovery,
  ]);

  const systemLogText = useMemo(
    () => terminalLines.map((line) => `${line.prefix} ${line.message}`).join("\n"),
    [terminalLines],
  );

  const finishManageSave = (result: {
    success: boolean;
    unlocked?: boolean;
    provider?: HandshakeProvider;
    providerLabel?: string;
  }) => {
    if (!isManageMode || !result.success || !result.unlocked || !result.provider) {
      return;
    }
    onVaultSuccess?.({
      provider: result.provider,
      providerLabel: result.providerLabel ?? getProviderRegistryEntry(result.provider).label,
    });
    onKeySaved?.();
  };

  const handleValidate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedKey = apiKey.trim();
    if (!trimmedKey || isHandshaking) return;

    setProvider(provider);
    setUsedCachedDiscovery(false);

    const lastDiscovery = readLastDiscoveryTimestamp();
    const canUseCachedDiscovery = isDiscoveryCacheFresh(lastDiscovery, refreshIntervalMinutes);

    if (!isManageMode && canUseCachedDiscovery) {
      const cachedModels = getCachedModelsForProvider(provider);

      if (cachedModels.length > 0) {
        try {
          await restoreDiscoveryFromCache(provider, trimmedKey, cachedModels);
          setUsedCachedDiscovery(true);
          return;
        } catch {
          setUsedCachedDiscovery(false);
        }
      }
    }

    const result = await runDiscovery(provider, trimmedKey, {
      setAsActive: isManageMode ? makeActive : true,
      isFirstKey,
      customEndpointUrl: providerRequiresCustomBaseUrl(provider)
        ? customEndpointUrl.trim()
        : null,
    });

    finishManageSave(result);
  };

  const handleProviderChange = (next: HandshakeProvider) => {
    setProviderState(next);
    setProvider(next);
  };

  const manageSaveText = manageConfirmLabel ?? manageSubmitLabel ?? "Save Key";
  const primarySubmitLabel = isManageMode
    ? isHandshaking
      ? "Validating…"
      : manageSaveText
    : isHandshaking
      ? "Igniting…"
      : "Validate & Discover Models";
  const igniteButtonClass = cn(
    monoClass,
    "h-11 w-full rounded-xl text-[11px] uppercase tracking-[0.14em]",
    manageIgniteGlow &&
      "border-0 bg-mint text-[oklch(0.16_0.04_268)] shadow-[0_0_28px_oklch(0.82_0.16_165/0.45)] hover:brightness-110",
  );

  const panel = (
    <div className={cn("flex flex-1 flex-col", fullScreen && "relative z-10")}>
      {!(isManageMode && hideManageHeader) ? (
      <div className="mb-6">
        <p
          className={cn(monoClass, "text-[11px] font-medium uppercase tracking-[0.2em]")}
          style={{ color: PRIMARY }}
        >
          <Terminal className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
          {isProtectMode ? "System Lock · Key Protector" : isManageMode ? "AI Keys · Vault" : workbenchPhaseHeader(4)}
        </p>
        <h2
          className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ color: TEXT }}
        >
          {isProtectMode
            ? "Re-authenticate your engine"
            : isManageMode
              ? (manageTitle ?? "Vault API Key")
              : (getWorkbenchPhase(4)?.headline ?? "Ignition Gate")}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: MUTED }}>
          {isProtectMode
            ? "Update your API key or Primary Fuel. Studio and Refinery progress stays intact behind this overlay."
            : isManageMode
              ? (manageDescription ??
                "Connect your AI provider and validate your key — same flow as onboarding Launch.")
              : "Connect your AI provider and choose your Primary Fuel before launch."}
        </p>
      </div>
      ) : null}

      <div
        className="rounded-xl border border-white/10 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]"
        style={{ backgroundColor: NAVY_SURFACE }}
      >
        <div
          className={cn(
            monoClass,
            "flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[9px] uppercase tracking-[0.18em]",
          )}
          style={{ color: MUTED, backgroundColor: NAVY_DEEP }}
        >
          <span className="flex items-center gap-2">
            <motion.span
              className="inline-block h-1.5 w-1.5 rounded-full"
              animate={
                showConfigPhase
                  ? { backgroundColor: MINT, boxShadow: `0 0 8px ${MINT}` }
                  : { backgroundColor: PRIMARY, boxShadow: `0 0 8px ${PRIMARY}` }
              }
            />
            System Terminal
          </span>
          <span style={{ color: showConfigPhase ? MINT : MUTED }}>
            {showConfigPhase ? "Phase 2 · Discovery" : "Phase 1 · Entry"}
          </span>
        </div>

        <div className="px-4 py-4">
          <form onSubmit={(event) => void handleValidate(event)} className="space-y-4">
            <div>
              <p
                className={cn(monoClass, "mb-2 text-[10px] uppercase tracking-[0.16em]")}
                style={{ color: MUTED }}
              >
                AI Brain
              </p>
              <ProviderFuelSelect
                value={provider}
                onChange={handleProviderChange}
                disabled={isHandshaking || isLaunching || lockProvider}
                monoClass={monoClass}
              />
            </div>

            {providerRequiresCustomBaseUrl(provider) ? (
              <div>
                <label
                  htmlFor={`${apiKeyInputId}-custom-base`}
                  className={cn(monoClass, "mb-2 block text-[10px] uppercase tracking-[0.16em]")}
                  style={{ color: MUTED }}
                >
                  OpenAI-compatible base URL
                </label>
                <input
                  id={`${apiKeyInputId}-custom-base`}
                  type="url"
                  value={customEndpointUrl}
                  onChange={(event) => setCustomEndpointUrl(event.target.value)}
                  disabled={isHandshaking || isLaunching}
                  placeholder="https://your-proxy.example.com/v1"
                  className={cn(
                    monoClass,
                    "w-full rounded-xl border border-white/10 bg-[oklch(0.14_0.03_268)] px-3 py-3 text-[12px] text-[oklch(0.98_0.01_268)] placeholder:text-[oklch(0.4_0.02_268)] focus:border-[oklch(0.62_0.21_265/0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265/0.35)] disabled:opacity-60",
                  )}
                />
              </div>
            ) : null}

            {isManageMode ? (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-[oklch(0.14_0.03_268)] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={makeActive}
                  onChange={(event) => setMakeActive(event.target.checked)}
                  disabled={isHandshaking || isLaunching}
                  className="h-4 w-4 rounded border-white/20 accent-[oklch(0.82_0.16_165)]"
                />
                <span className={cn(monoClass, "text-[11px] text-[oklch(0.88_0.02_268)]")}>
                  Set as primary BYOK key for the engine
                </span>
              </label>
            ) : null}

            <div>
              <label
                htmlFor={apiKeyInputId}
                className={cn(monoClass, "mb-2 block text-[10px] uppercase tracking-[0.16em]")}
                style={{ color: MUTED }}
              >
                API Key
              </label>
              <div className="relative rounded-xl p-[1px]">
                <InputBorderScan active={isHandshaking} />
                <div className="relative flex items-center">
                  <KeyRound
                    className="pointer-events-none absolute left-3 z-10 h-4 w-4"
                    style={{ color: MUTED }}
                    aria-hidden="true"
                  />
                  <input
                    id={apiKeyInputId}
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isHandshaking || isLaunching}
                    placeholder="sk-… or sk-ant-…"
                    className={cn(
                      monoClass,
                      "relative z-[1] w-full rounded-xl border border-white/10 bg-[oklch(0.14_0.03_268)] py-3 pl-10 pr-11 text-[12px] tracking-wide text-[oklch(0.98_0.01_268)] placeholder:text-[oklch(0.4_0.02_268)] focus:border-[oklch(0.62_0.21_265/0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265/0.35)] disabled:opacity-60",
                      isHandshaking && "border-[oklch(0.62_0.21_265/0.45)]",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((value) => !value)}
                    className="absolute right-2 z-10 rounded-lg p-2 text-[oklch(0.65_0.02_268)] transition-colors hover:bg-white/[0.06] hover:text-[oklch(0.9_0.02_268)]"
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {!showConfigPhase || isManageMode ? (
              <Button
                type="submit"
                disabled={
                  !apiKey.trim() ||
                  (providerRequiresCustomBaseUrl(provider) && !customEndpointUrl.trim()) ||
                  isHandshaking ||
                  isLaunching
                }
                variant={manageIgniteGlow && isManageMode ? "mint" : undefined}
                className={cn(
                  igniteButtonClass,
                  !(manageIgniteGlow && isManageMode) &&
                    "border-0 text-[11px] uppercase tracking-[0.14em]",
                  !(manageIgniteGlow && isManageMode) && monoClass,
                )}
                style={
                  manageIgniteGlow && isManageMode
                    ? undefined
                    : { backgroundColor: PRIMARY, color: TEXT }
                }
              >
                {primarySubmitLabel}
              </Button>
            ) : null}
          </form>

          <div
            className="mt-4 rounded-xl border border-white/[0.06] bg-[oklch(0.1_0.025_268)] px-3 py-3"
            role="log"
            aria-live="polite"
            aria-label="Ignition terminal log"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={cn(monoClass, "text-[9px] uppercase tracking-[0.16em]")} style={{ color: MUTED }}>
                System Log
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(monoClass, "hidden text-[9px] uppercase tracking-[0.12em] sm:inline")} style={{ color: MUTED }}>
                  Copy System Log
                </span>
                <ClipboardButton
                  value={systemLogText}
                  label="Copy system log"
                  copiedLabel="Log copied"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {terminalLines.map((line) => (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.28 }}
                    className={cn(monoClass, "flex gap-2 text-[11px] leading-relaxed")}
                  >
                    <span className="shrink-0 font-semibold" style={{ color: toneColor(line.tone) }}>
                      {line.prefix}
                    </span>
                    <span style={{ color: "oklch(0.86 0.02 268)" }}>{line.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showConfigPhase ? (
            <motion.div
              key="discovery-drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.48, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden border-t border-white/10"
              style={{ backgroundColor: NAVY_DEEP }}
            >
              <div className="relative px-4 py-4">
                <DiscoveryListPulse active />

                <div className="relative mb-3 flex items-center justify-between gap-3">
                  <p
                    className={cn(monoClass, "text-[10px] uppercase tracking-[0.16em]")}
                    style={{ color: MINT }}
                  >
                    Discovery List
                  </p>
                  {providerLabel ? (
                    <span
                      className={cn(monoClass, "text-[10px] uppercase tracking-[0.12em]")}
                      style={{ color: MUTED }}
                    >
                      {providerLabel}
                    </span>
                  ) : null}
                </div>

                <div
                  className={cn(
                    monoClass,
                    "relative max-h-56 space-y-1 overflow-y-auto rounded-xl border border-white/[0.08] bg-[oklch(0.09_0.022_268)] p-2",
                  )}
                  role="listbox"
                  aria-label="Career-grade models"
                >
                  {availableModels.map((modelId) => {
                    const selected = activeModel === modelId;
                    const recommended = recommendedModel === modelId;

                    return (
                      <motion.button
                        key={modelId}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setActiveModel(modelId)}
                        disabled={isLaunching}
                        animate={
                          recommended
                            ? {
                                boxShadow: [
                                  "0 0 0 0 oklch(0.82 0.16 165 / 0)",
                                  "0 0 16px oklch(0.82 0.16 165 / 0.45)",
                                  "0 0 0 0 oklch(0.82 0.16 165 / 0)",
                                ],
                              }
                            : undefined
                        }
                        transition={
                          recommended
                            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            : undefined
                        }
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] leading-none transition-colors disabled:opacity-50",
                          selected
                            ? "bg-[oklch(0.82_0.16_165/0.14)] shadow-[inset_0_0_0_1px_oklch(0.82_0.16_165/0.35)]"
                            : "hover:bg-white/[0.04]",
                        )}
                        style={{ color: recommended ? MINT : "oklch(0.88 0.02 268)" }}
                      >
                        <span className="truncate">{modelId}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {recommended ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em]"
                              style={{ color: NAVY_CANVAS, backgroundColor: MINT }}
                            >
                              <Sparkles className="h-3 w-3" aria-hidden="true" />
                              Recommended
                            </span>
                          ) : null}
                          {selected ? (
                            <span
                              className="text-[9px] uppercase tracking-[0.14em]"
                              style={{ color: MINT }}
                            >
                              Primary
                            </span>
                          ) : null}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <p
                  className={cn(monoClass, "relative mt-3 text-[10px] leading-relaxed")}
                  style={{ color: MUTED }}
                >
                  Select your Primary Fuel — this model powers resume tuning and apply automation.
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {canLaunch ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-6"
          >
            <Button
              type="button"
              variant="mint"
              size="xl"
              disabled={isLaunching}
              onClick={onLaunch}
              className={cn(monoClass, "w-full rounded-xl text-[11px] uppercase tracking-[0.14em]")}
            >
              <Rocket className="h-4 w-4" aria-hidden="true" />
              {isLaunching ? "Launching…" : "Launch to Dashboard"}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {canResume ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-6"
          >
            <Button
              type="button"
              variant="mint"
              size="xl"
              disabled={isLaunching}
              onClick={onResume}
              className={cn(monoClass, "w-full rounded-xl text-[11px] uppercase tracking-[0.14em]")}
            >
              <Unlock className="h-4 w-4" aria-hidden="true" />
              Resume Session
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

  if (!fullScreen) {
    return panel;
  }

  return (
    <GlossyFullscreenShell
      aria-label="Ignition Gate — engine authentication required"
      contentClassName="mx-auto max-w-xl px-6 py-10 sm:py-14"
    >
      {panel}
    </GlossyFullscreenShell>
  );
}
