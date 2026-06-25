import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  nameClassName?: string;
  suffixClassName?: string;
};

/** EasySubmit (white) + .ai (mint) — matches home Navbar branding. */
export function BrandWordmark({
  className,
  nameClassName = "text-white",
  suffixClassName = "text-mint",
}: BrandWordmarkProps) {
  return (
    <span className={cn("font-display font-semibold tracking-tight", className)}>
      <span className={nameClassName}>{BRAND.name}</span>
      <span className={suffixClassName}>{BRAND.suffix}</span>
    </span>
  );
}
