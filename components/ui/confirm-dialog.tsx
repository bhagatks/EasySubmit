"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlossyModal } from "@/components/ui/glossy-modal";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "mint";
  onConfirm: () => void | Promise<void | boolean>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    try {
      const result = await onConfirm();
      if (result !== false) {
        onOpenChange(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <GlossyModal
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      busy={pending}
      hideClose
      placement="center"
      title={title}
      description={description}
      className="w-[min(448px,calc(100vw-2rem))]"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={
              confirmVariant === "destructive"
                ? "destructive"
                : confirmVariant === "mint"
                  ? "mint"
                  : "hero"
            }
            className="rounded-xl"
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? "Please wait…" : confirmLabel}
          </Button>
        </div>
      }
    />
  );
}
