"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  type ButtonPurpose,
  webButtonPurposeProps,
} from "@/src/shared/brand-buttons";
import { cn } from "@/lib/utils";

export type PurposeButtonProps = ButtonProps & {
  purpose: ButtonPurpose;
};

/**
 * Web dashboard button — picks variant + classes from `webButtonPurposeProps`.
 * Use `purpose` so actions read the same as extension (primary = main, secondary = supporting, …).
 */
export function PurposeButton({
  purpose,
  className,
  variant: _variant,
  ...props
}: PurposeButtonProps) {
  const mapped = webButtonPurposeProps(purpose);
  return (
    <Button
      variant={mapped.variant}
      className={cn(mapped.className, className)}
      {...props}
    />
  );
}
