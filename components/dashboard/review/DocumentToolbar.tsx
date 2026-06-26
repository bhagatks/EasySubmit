"use client";

import Link from "next/link";
import { FileCode2, Loader2, Pencil, Sparkles } from "lucide-react";
import { PdfDownloadIcon, WordDownloadIcon } from "@/components/dashboard/review/format-download-icons";
import { ReviewPreviewChromeButton } from "@/components/dashboard/review/ReviewPreviewChromeButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DocumentToolbarAction = {
  id: string;
  label: string;
  icon?: "studio" | "edit" | "enhance" | "pdf" | "word" | "latex";
  variant?: "default" | "mint" | "mintOutline" | "outline";
  disabled?: boolean;
  busy?: boolean;
  href?: string;
  onClick?: () => void;
  title?: string;
};

const ICONS = {
  studio: Pencil,
  edit: Pencil,
  enhance: Sparkles,
  pdf: PdfDownloadIcon,
  word: WordDownloadIcon,
  latex: FileCode2,
} as const;

type DocumentToolbarProps = {
  actions: DocumentToolbarAction[];
  className?: string;
  /** Float on white document preview with dark glossy chrome. */
  appearance?: "default" | "overlay";
};

export function DocumentToolbar({
  actions,
  className,
  appearance = "default",
}: DocumentToolbarProps) {
  const isOverlay = appearance === "overlay";

  return (
    <div
      className={cn(
        "flex shrink-0 gap-1.5 overflow-x-auto",
        !isOverlay && "pb-1",
        className,
      )}
    >
      {actions.map((action) => {
        const Icon = action.icon ? ICONS[action.icon] : null;
        const content = (
          <>
            {action.busy ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
            ) : Icon ? (
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : null}
            <span>{action.busy && action.id === "enhance" ? "Enhancing…" : action.label}</span>
          </>
        );

        const variant =
          action.variant === "mint"
            ? "mint"
            : action.variant === "mintOutline"
              ? "mintOutline"
              : action.variant === "outline"
                ? "outline"
                : "outline";

        const isDisabled = Boolean(action.disabled || action.busy);

        if (isOverlay) {
          return (
            <ReviewPreviewChromeButton
              key={action.id}
              href={action.href}
              disabled={isDisabled}
              onClick={action.onClick}
              title={action.title}
            >
              {content}
            </ReviewPreviewChromeButton>
          );
        }

        if (action.href) {
          return (
            <Button
              key={action.id}
              variant={variant}
              size="sm"
              className="shrink-0 rounded-xl"
              asChild
              disabled={action.disabled}
              title={action.title}
            >
              <Link href={action.href}>{content}</Link>
            </Button>
          );
        }

        return (
          <Button
            key={action.id}
            type="button"
            variant={variant}
            size="sm"
            className="shrink-0 rounded-xl"
            disabled={isDisabled}
            onClick={action.onClick}
            title={action.title}
          >
            {content}
          </Button>
        );
      })}
    </div>
  );
}
