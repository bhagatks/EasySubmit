"use client";

import { JetBrains_Mono } from "next/font/google";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, Star, Trash2 } from "lucide-react";
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
import { GlossyModal } from "@/components/ui/glossy-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert } from "@/components/ui/inline-alert";
import { IgnitionGate } from "@/src/components/auth/IgnitionGate";
import { HANDSHAKE_PROVIDERS, type HandshakeProvider } from "@/src/lib/config/career-grade-models";
import { getProviderRegistryEntry } from "@/src/lib/config/app.config";
import { trackByokCtaClicked } from "@/src/shared/analytics/product-events";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

type EditorState =
  | { mode: "add" }
  | { mode: "edit"; provider: HandshakeProvider };

type SettingsVaultKeysPanelProps = {
  initialKeys: VaultedApiKeySummary[];
  /** Open add-key modal on mount (e.g. `?addKey=1`). */
  openAddOnMount?: boolean;
  /** Increment to open add-key modal (Settings header BYOK CTA). */
  openAddRequestId?: number;
};

export function SettingsVaultKeysPanel({
  initialKeys,
  openAddOnMount = false,
  openAddRequestId = 0,
}: SettingsVaultKeysPanelProps) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blastPayload, setBlastPayload] = useState<IgnitionBlastPayload | null>(null);
  const [removeTarget, setRemoveTarget] = useState<HandshakeProvider | null>(null);
  const [addOnMountHandled, setAddOnMountHandled] = useState(false);

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

  const openAddEditor = useCallback(() => {
    trackByokCtaClicked("settings_add_key");
    setEditor({ mode: "add" });
  }, []);

  useEffect(() => {
    if (!openAddOnMount || addOnMountHandled) return;
    setAddOnMountHandled(true);
    openAddEditor();
  }, [addOnMountHandled, openAddOnMount, openAddEditor]);

  useEffect(() => {
    if (openAddRequestId <= 0) return;
    openAddEditor();
  }, [openAddRequestId, openAddEditor]);

  const closeEditor = useCallback(() => {
    setEditor(null);
  }, []);

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
    router.refresh();
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
      closeEditor();
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
    closeEditor();
    void refreshKeys().then(() => router.refresh());
  }, [closeEditor, refreshKeys, router]);

  const handleSaved = async () => {
    setError(null);
    await refreshKeys();
    router.refresh();
  };

  const editorTitle =
    editor?.mode === "edit"
      ? `Replace ${getProviderRegistryEntry(editor.provider).label} key`
      : "Add provider key";

  const editorDescription =
    editor?.mode === "edit"
      ? "Enter a new API key for this provider. The prior vault secret will be replaced."
      : "Pick a provider and paste your API key — validate, then ignite.";

  return (
    <>
      <IgnitionBlastOverlay payload={blastPayload} onComplete={handleBlastComplete} />

      <IgnitionChamberShake active={Boolean(blastPayload)}>
        <div className="space-y-3">
          {error ? <InlineAlert surface="glass">{error}</InlineAlert> : null}

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Provider keys</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Vault one key per provider. Raw secrets stay in Supabase Vault.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-xl"
              onClick={openAddEditor}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add key
            </Button>
          </div>

          {keys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-6 text-center">
              <KeyRound className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                No vaulted keys yet. Add your first provider key to power AI tailoring.
              </p>
              <Button
                type="button"
                variant="hero"
                className="mt-4 rounded-xl"
                onClick={openAddEditor}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add your first key
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {keys.map((key) => {
                const isBusy = busyProvider === key.provider;

                return (
                  <li
                    key={key.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {key.providerLabel}
                        </span>
                        {key.isActive ? (
                          <span
                            className={
                              mono +
                              " rounded-full border border-mint/40 bg-mint/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mint"
                            }
                          >
                            Primary
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {key.vaultHint} · Updated{" "}
                        {new Date(key.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!key.isActive ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleSetActive(key.provider)}
                          className="h-8 rounded-lg px-2"
                          title="Set as primary"
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => setEditor({ mode: "edit", provider: key.provider })}
                        className="h-8 rounded-lg px-2"
                        title="Edit key"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => setRemoveTarget(key.provider)}
                        className="h-8 rounded-lg px-2 text-destructive hover:text-destructive"
                        title="Remove key"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </IgnitionChamberShake>

      <GlossyModal
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
        title={editorTitle}
        description={editorDescription}
        className="max-w-lg"
      >
        {editor ? (
          <IgnitionGate
            variant="manage"
            monoClass={mono}
            apiKeyInputId={
              editor.mode === "edit" ? `manage-key-${editor.provider}` : "manage-key-add"
            }
            initialProvider={editor.mode === "edit" ? editor.provider : addProviderDefault}
            lockProvider={editor.mode === "edit"}
            setAsActiveOnSave={editor.mode === "add" ? keys.length === 0 : false}
            isFirstKey={editor.mode === "add" && keys.length === 0}
            manageTitle={editorTitle}
            manageDescription={editorDescription}
            manageSubmitLabel="Save Key"
            manageIgniteGlow
            hideManageHeader
            onVaultSuccess={handleVaultSuccess}
            onKeySaved={() => void handleSaved()}
          />
        ) : null}
      </GlossyModal>

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
    </>
  );
}
