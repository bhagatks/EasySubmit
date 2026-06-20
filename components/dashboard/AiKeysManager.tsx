"use client";

import { JetBrains_Mono } from "next/font/google";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import {
  listVaultedApiKeys,
  removeVaultedApiKey,
  setActiveVaultedApiKey,
  type VaultedApiKeySummary,
} from "@/app/actions/ai/vault-key";
import {
  IgnitionBlastOverlay,
  IgnitionChamberShake,
  type IgnitionBlastPayload,
} from "@/components/keys/IgnitionBlast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert } from "@/components/ui/inline-alert";
import { IgnitionGate } from "@/src/components/auth/IgnitionGate";
import { ProviderIcon } from "@/src/components/shared/ProviderIcon";
import { HANDSHAKE_PROVIDERS, type HandshakeProvider } from "@/src/lib/config/career-grade-models";
import { getProviderRegistryEntry } from "@/src/lib/config/app.config";
import { cn } from "@/lib/utils";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const NAVY_CANVAS = "oklch(0.16 0.04 268)";
const TECH_BORDER = "oklch(0.62 0.21 265 / 0.15)";
const SYSTEM_MINT = "oklch(0.82 0.16 165)";

type EditorState =
  | { mode: "add" }
  | { mode: "edit"; provider: HandshakeProvider };

type AiKeysManagerProps = {
  initialKeys: VaultedApiKeySummary[];
};

export function AiKeysManager({ initialKeys }: AiKeysManagerProps) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blastPayload, setBlastPayload] = useState<IgnitionBlastPayload | null>(null);
  const [removeTarget, setRemoveTarget] = useState<HandshakeProvider | null>(null);

  const mono = jetbrainsMono.className;

  const refreshKeys = useCallback(async () => {
    const next = await listVaultedApiKeys();
    setKeys(next);
    return next;
  }, []);

  useEffect(() => {
    setKeys(initialKeys);
  }, [initialKeys]);

  const usedProviders = useMemo(
    () => new Set(keys.map((key) => key.provider)),
    [keys],
  );

  const addProviderDefault = useMemo(() => {
    return (
      HANDSHAKE_PROVIDERS.find((provider) => !usedProviders.has(provider)) ??
      HANDSHAKE_PROVIDERS[0]
    );
  }, [usedProviders]);

  const handleSetActive = async (provider: HandshakeProvider) => {
    setBusyProvider(provider);
    setError(null);
    const result = await setActiveVaultedApiKey(provider);
    setBusyProvider(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await refreshKeys();
  };

  const handleRemove = async (provider: HandshakeProvider): Promise<boolean> => {
    setBusyProvider(provider);
    setError(null);
    const result = await removeVaultedApiKey(provider);
    setBusyProvider(null);
    if (!result.success) {
      setError(result.error);
      return false;
    }
    if (editor?.mode === "edit" && editor.provider === provider) {
      setEditor(null);
    }
    const next = await refreshKeys();
    if (!next.some((key) => key.isActive)) {
      useIgnitionStore.getState().resetIgnition();
    }
    router.refresh();
    return true;
  };

  const handleConfirmRemove = async (): Promise<boolean> => {
    if (!removeTarget) return false;
    const ok = await handleRemove(removeTarget);
    if (ok) {
      setRemoveTarget(null);
    }
    return ok;
  };

  const handleVaultSuccess = useCallback(
    (payload: { provider: HandshakeProvider; providerLabel: string }) => {
      setBlastPayload({ ...payload, origin: { x: 50, y: 45 } });
    },
    [],
  );

  const handleBlastComplete = useCallback(() => {
    setBlastPayload(null);
    setEditor(null);
    void refreshKeys().then(() => router.refresh());
  }, [refreshKeys, router]);

  const handleSaved = async () => {
    setError(null);
    await refreshKeys();
  };

  return (
    <div
      className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl"
      style={{ border: `1px solid ${TECH_BORDER}`, backgroundColor: NAVY_CANVAS }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.62 0.21 265 / 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.62 0.21 265 / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, oklch(0.62 0.21 265 / 0.08), transparent 55%)",
        }}
      />

      <IgnitionBlastOverlay payload={blastPayload} onComplete={handleBlastComplete} />

      <IgnitionChamberShake active={Boolean(blastPayload)}>
        <div className="relative space-y-6 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className={cn(mono, "text-[10px] font-medium uppercase tracking-[0.18em]")}
              style={{ color: SYSTEM_MINT }}
            >
              BYOK Vault
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
              AI Keys
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vault provider keys per provider. Raw secrets never leave Supabase Vault.
            </p>
          </div>
          <Button
            type="button"
            variant="mint"
            onClick={() => setEditor({ mode: "add" })}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Add key
          </Button>
        </div>

        {error ? <InlineAlert>{error}</InlineAlert> : null}

        {keys.length === 0 && !editor ? (
          <div
            className="rounded-2xl border border-dashed p-8 text-center"
            style={{
              borderColor: TECH_BORDER,
              backgroundColor: "oklch(0.14 0.03 268 / 0.5)",
            }}
          >
            <p className="text-sm text-muted-foreground">
              No vaulted keys yet. Add your first provider key to power the AI engine.
            </p>
            <Button
              type="button"
              variant="hero"
              className="mt-4 rounded-xl"
              onClick={() => setEditor({ mode: "add" })}
            >
              <Plus className="h-4 w-4" />
              Add your first key
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {keys.map((key) => {
              const entry = getProviderRegistryEntry(key.provider);
              const isBusy = busyProvider === key.provider;

              return (
                <li
                  key={key.id}
                  className="rounded-2xl border bg-surface/60 p-4 sm:p-5"
                  style={{ borderColor: TECH_BORDER }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                        style={{
                          borderColor: TECH_BORDER,
                          backgroundColor: "oklch(0.14 0.03 268)",
                        }}
                      >
                        <ProviderIcon icon={entry.icon} className="text-mint" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{key.providerLabel}</span>
                          {key.isActive ? (
                            <span
                              className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                              style={{
                                color: SYSTEM_MINT,
                                borderColor: "oklch(0.82 0.16 165 / 0.4)",
                                backgroundColor: "oklch(0.82 0.16 165 / 0.1)",
                              }}
                            >
                              Primary BYOK
                            </span>
                          ) : null}
                        </div>
                        <p className={cn(mono, "mt-1 text-xs text-muted-foreground tabular-nums")}>
                          {key.vaultHint}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Updated {new Date(key.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!key.isActive ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleSetActive(key.provider)}
                          className="rounded-xl"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Set active
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => setEditor({ mode: "edit", provider: key.provider })}
                        className="rounded-xl"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit key
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => setRemoveTarget(key.provider)}
                        className="rounded-xl text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {editor ? (
          <div
            className="rounded-2xl border p-4 sm:p-6"
            style={{
              borderColor: "oklch(0.62 0.21 265 / 0.28)",
              backgroundColor: "oklch(0.14 0.03 268 / 0.72)",
              boxShadow: "inset 0 0 48px oklch(0.62 0.21 265 / 0.08)",
            }}
          >
            <IgnitionGate
              variant="manage"
              monoClass={mono}
              apiKeyInputId={
                editor.mode === "edit"
                  ? `manage-key-${editor.provider}`
                  : "manage-key-add"
              }
              initialProvider={
                editor.mode === "edit" ? editor.provider : addProviderDefault
              }
              lockProvider={editor.mode === "edit"}
              setAsActiveOnSave={editor.mode === "add" ? keys.length === 0 : false}
              manageTitle={
                editor.mode === "edit"
                  ? `Replace ${getProviderRegistryEntry(editor.provider).label} key`
                  : "Add provider key"
              }
              manageDescription={
                editor.mode === "edit"
                  ? "Enter a new API key for this provider. The prior vault secret will be replaced."
                  : "Pick a provider and paste your API key — validate, then ignite."
              }
              manageSubmitLabel="Save Key"
              manageIgniteGlow
              onVaultSuccess={handleVaultSuccess}
              onKeySaved={() => void handleSaved()}
            />
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                onClick={() => setEditor(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        </div>
      </IgnitionChamberShake>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove this API key?"
        description="The vaulted secret will be deleted from your account. You can add a new key anytime."
        confirmLabel="Remove key"
        cancelLabel="Keep key"
        confirmVariant="destructive"
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}
