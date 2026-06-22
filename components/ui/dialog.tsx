"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { GlossySheen } from "@/components/ui/glossy-sheen";
import { GLOSSY_OVERLAY_CLASS, GLOSSY_PANEL_CLASS } from "@/components/ui/glossy-tokens";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
    appearance?: "default" | "glossy";
  }
>(({ className, appearance = "default", ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[99] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      appearance === "glossy" ? GLOSSY_OVERLAY_CLASS : "bg-black/80",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean;
    appearance?: "default" | "glossy";
    /** Use flex column for scrollable panels (header / body / footer). */
    layout?: "grid" | "flex";
    /**
     * `center` — viewport center via flex shell (avoids transform vs animate-in conflicts).
     * `login-panel` — centered in the 450px login column on lg+; viewport center on mobile.
     */
    placement?: "center" | "login-panel";
  }
>(
  (
    {
      className,
      children,
      hideClose = false,
      appearance = "default",
      layout = "grid",
      placement = "center",
      ...props
    },
    ref,
  ) => {
    const panelClassName = cn(
      "relative gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
      layout === "flex" ? "flex flex-col" : "grid",
      appearance === "glossy" && cn("overflow-hidden sm:rounded-2xl", GLOSSY_PANEL_CLASS),
      placement === "center" && "w-[min(512px,calc(100vw-2rem))] max-h-[min(90dvh,720px)]",
      placement === "login-panel" &&
        "w-[min(400px,calc(100vw-2rem))] max-h-[min(90dvh,720px)] lg:w-[min(400px,calc(450px-2rem))]",
      className,
    );

    const closeButton = hideClose ? null : (
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    );

    if (placement === "center") {
      return (
        <DialogPortal>
          <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center px-4 py-[max(1rem,5dvh)]">
            <DialogOverlay appearance={appearance} className="pointer-events-auto absolute inset-0 z-0" />
            <DialogPrimitive.Content
              ref={ref}
              className={cn("pointer-events-auto z-10", panelClassName)}
              {...props}
            >
              {appearance === "glossy" ? <GlossySheen /> : null}
              {children}
              {closeButton}
            </DialogPrimitive.Content>
          </div>
        </DialogPortal>
      );
    }

    return (
      <DialogPortal>
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[max(1rem,5dvh)] lg:items-center lg:justify-end lg:pr-[25px]">
          <DialogOverlay appearance={appearance} className="pointer-events-auto absolute inset-0 z-0" />
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "pointer-events-auto z-10 lg:ml-auto",
              panelClassName,
            )}
            {...props}
          >
            {appearance === "glossy" ? <GlossySheen /> : null}
            {children}
            {closeButton}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
