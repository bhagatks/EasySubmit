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
  useDashboardExpandAllControl,
  useRegisterDashboardHeaderActions,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import {
  DashboardWorkspacePage,
  DashboardWorkspaceStack,
} from "@/components/dashboard/DashboardWorkspacePage";
import {
  IgnitionBlastOverlay,
  IgnitionChamberShake,
  type IgnitionBlastPayload,
} from "@/components/keys/IgnitionBlast";
import { StudioCollapsibleSection } from "@/components/resume/StudioCollapsibleSection";
import { StudioIconButton } from "@/components/resume/StudioIconButton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert } from "@/components/ui/inline-alert";
import { IgnitionGate } from "@/src/components/auth/IgnitionGate";
import { HANDSHAKE_PROVIDERS, type HandshakeProvider } from "@/src/lib/config/career-grade-models";
import { getProviderRegistryEntry } from "@/src/lib/config/app.config";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const VAULT_EDITOR_SECTION_ID = "vault-editor";

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

  const sectionIds = useMemo(() => {
    const ids = keys.map((key) => key.id);
    if (editor) {
      ids.push(VAULT_EDITOR_SECTION_ID);
    }
    return ids;
  }, [editor, keys]);

  const { expanded, toggleSection, setExpanded } = useDashboardExpandAllControl(sectionIds, {
    disabled: sectionIds.length === 0,
  });

  const openAddEditor = useCallback(() => {
    setEditor({ mode: "add" });
    setExpanded((current) => ({ ...current, [VAULT_EDITOR_SECTION_ID]: true }));
  }, [setExpanded]);

  const addKeyAction = useMemo(
    () => (
      <StudioIconButton
        type="button"
        tone="bordered"
        aria-label="Add API key"
        title="Add key"
        onClick={openAddEditor}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </StudioIconButton>
    ),
    [openAddEditor],
  );

  useRegisterDashboardHeaderActions(addKeyAction);

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
    <>
      <IgnitionBlastOverlay payload={blastPayload} onComplete={handleBlastComplete} />

      <IgnitionChamberShake active={Boolean(blastPayload)}>
        <DashboardWorkspacePage
          title="AI Keys"
          description="Vault provider keys per provider. Raw secrets never leave Supabase Vault."
        >
          {error ? <InlineAlert surface="glass">{error}</InlineAlert> : null}

          <DashboardWorkspaceStack>
            {keys.map((key) => {
              const isBusy = busyProvider === key.provider;

              return (
                <StudioCollapsibleSection
                  key={key.id}
                  title={key.providerLabel}
                  description={`${key.vaultHint} · Updated ${new Date(key.updatedAt).toLocaleDateString()}${
                    key.isActive ? " · Primary BYOK" : ""
                  }`}
                  expanded={Boolean(expanded[key.id])}
                  onToggle={() => toggleSection(key.id)}
                  variant="dashboard"
                  monoClass={mono}
                  showDragHandle={false}
                >
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
                      onClick={() => {
                        setEditor({ mode: "edit", provider: key.provider });
                        setExpanded((current) => ({
                          ...current,
                          [VAULT_EDITOR_SECTION_ID]: true,
                        }));
                      }}
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
                </StudioCollapsibleSection>
              );
            })}

            {editor ? (
              <StudioCollapsibleSection
                title={editor.mode === "edit" ? "Replace provider key" : "Add provider key"}
                description={
                  editor.mode === "edit"
                    ? `Update ${getProviderRegistryEntry(editor.provider).label} vault secret`
                    : "Pick a provider and paste your API key"
                }
                expanded={Boolean(expanded[VAULT_EDITOR_SECTION_ID])}
                onToggle={() => toggleSection(VAULT_EDITOR_SECTION_ID)}
                variant="dashboard"
                monoClass={mono}
                showDragHandle={false}
              >
                <div className="space-y-4 rounded-xl border border-border/70 bg-background/30 p-4">
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
                  <div className="flex justify-end">
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
              </StudioCollapsibleSection>
            ) : null}

            {keys.length === 0 && !editor ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No vaulted keys yet. Add your first provider key to power the AI engine.
                </p>
                <Button
                  type="button"
                  variant="hero"
                  className="mt-4 rounded-xl"
                  onClick={openAddEditor}
                >
                  <Plus className="h-4 w-4" />
                  Add your first key
                </Button>
              </div>
            ) : null}
          </DashboardWorkspaceStack>
        </DashboardWorkspacePage>
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
    </>
  );
}
