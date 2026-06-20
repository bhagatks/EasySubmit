"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TECH_BORDER = "oklch(0.62 0.21 265 / 0.28)";

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
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent
        hideClose
        className={cn(
          "max-w-md rounded-2xl border bg-surface/95 p-6 shadow-elevated sm:rounded-2xl",
        )}
        style={{ borderColor: TECH_BORDER }}
        onPointerDownOutside={(event) => pending && event.preventDefault()}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2 sm:gap-2">
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
            variant={confirmVariant === "destructive" ? "destructive" : confirmVariant === "mint" ? "mint" : "hero"}
            className="rounded-xl"
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? "Please wait…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
