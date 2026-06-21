import { cn } from "@/lib/utils";
import { GLOSSY_SHEEN_STYLE } from "@/components/ui/glossy-tokens";

type GlossySheenProps = {
  className?: string;
  rounded?: string;
};

/** Radial teal/mint highlight layer for glossy panels. */
export function GlossySheen({ className, rounded = "rounded-2xl" }: GlossySheenProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0", rounded, className)}
      aria-hidden
      style={GLOSSY_SHEEN_STYLE}
    />
  );
}
