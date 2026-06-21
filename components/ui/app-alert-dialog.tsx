"use client";

import type { ReactNode } from "react";
import { GlossyModal } from "@/components/ui/glossy-modal";
import { cn } from "@/lib/utils";

type AppAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  busy?: boolean;
};

/** Glossy alert / error modal with title, description, and custom footer actions. */
export function AppAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  busy = false,
}: AppAlertDialogProps) {
  return (
    <GlossyModal
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title={title}
      description={description}
      className={cn("w-[min(448px,calc(100vw-2rem))]", className)}
      footer={
        footer ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {footer}
          </div>
        ) : undefined
      }
    >
      {children}
    </GlossyModal>
  );
}
