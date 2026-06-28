import {
  Bookmark,
  Briefcase,
  FileText,
  Mail,
  RefreshCw,
  Settings,
  User,
  X,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { BRAND_COLORS } from "@/src/shared/brand-colors";
import { LogoIcon } from "@/components/ui/logo";
import { CARD_NAV_LABELS } from "@/src/shared/extension/card-layout-tokens";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    key: "jobInfo" as const,
    label: CARD_NAV_LABELS.jobInfo,
    icon: Briefcase,
    iconClass: "text-indigo-600 bg-indigo-500/10",
  },
  {
    key: "resume" as const,
    label: CARD_NAV_LABELS.resume,
    icon: FileText,
    iconClass: "text-teal-600 bg-teal-500/10",
  },
  {
    key: "coverLetter" as const,
    label: CARD_NAV_LABELS.coverLetter,
    icon: Mail,
    iconClass: "text-blue-600 bg-blue-500/10",
  },
];

type ExtensionCardPanelProps = {
  size?: "default" | "hero";
};

function ExtensionCardPanel({ size = "default" }: ExtensionCardPanelProps) {
  const hero = size === "hero";

  return (
    <div
      className={cn("relative", hero ? "rounded-[22px] p-2.5" : "rounded-2xl p-[7px]")}
      style={{
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(22px) saturate(1.45)",
        border: "1px solid rgba(255, 255, 255, 0.52)",
        boxShadow:
          "0 10px 36px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.72), inset 0 -1px 0 rgba(255, 255, 255, 0.18)",
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          hero ? "rounded-[22px]" : "rounded-2xl",
        )}
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 95% 60% at 50% -8%, rgba(99, 102, 241, 0.16), transparent 58%), radial-gradient(ellipse 80% 50% at 50% 108%, rgba(255, 255, 255, 0.22), transparent 62%)",
        }}
      />
      <div
        className={cn(
          "relative overflow-hidden border border-white/95 bg-white/[0.96] shadow-[0_4px_14px_rgba(15,23,42,0.07),inset_0_1px_0_#fff]",
          hero ? "rounded-2xl" : "rounded-xl",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between border-b border-indigo-500/[0.12] bg-indigo-500/[0.05]",
            hero ? "px-5 py-3.5" : "px-3 py-2",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              className={cn(
                "leading-none tracking-widest text-gray-400",
                hero ? "text-base" : "text-sm",
              )}
            >
              ⋮⋮
            </span>
            <LogoIcon className={cn("shrink-0 rounded-[5px]", hero ? "h-7 w-7" : "h-5 w-5")} />
            <span
              className={cn(
                "truncate font-bold tracking-tight text-[#1F2937]",
                hero ? "text-sm" : "text-xs",
              )}
            >
              {BRAND.name}
              <span style={{ color: BRAND_COLORS.primary.hex }}>{BRAND.suffix}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {[User, RefreshCw, Settings].map((Icon, index) => (
              <span
                key={index}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg text-gray-400",
                  hero ? "h-8 w-8" : "h-6 w-6",
                )}
              >
                <Icon className={hero ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
              </span>
            ))}
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-lg text-gray-400",
                hero ? "h-8 w-8" : "h-6 w-6",
              )}
            >
              <X className={hero ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
            </span>
          </div>
        </div>

        <div className={cn(hero ? "px-6 pb-7 pt-6" : "px-4 pb-[18px] pt-4")}>
          <div className={cn("flex flex-col", hero ? "gap-4" : "gap-3")}>
            <h3
              className={cn(
                "m-0 font-bold leading-snug tracking-tight text-[#1F2937]",
                hero ? "text-[22px]" : "text-base",
              )}
            >
              Senior Product Manager
            </h3>
            <p
              className={cn(
                "m-0 truncate leading-snug text-[#6B7280]",
                hero ? "text-[15px]" : "text-[13px]",
              )}
            >
              Workday
            </p>

            <div className={cn("grid grid-cols-3", hero ? "gap-2.5" : "gap-1.5")}>
              {NAV_ITEMS.map(({ label, icon: Icon, iconClass }) => (
                <div
                  key={label}
                  className={cn(
                    "flex flex-col items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]",
                    hero ? "gap-1.5 px-2 py-3.5" : "gap-1 px-1 py-2",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-[10px]",
                      iconClass,
                      hero ? "h-[38px] w-[38px]" : "h-[30px] w-[30px]",
                    )}
                  >
                    <Icon className={hero ? "h-[21px] w-[21px]" : "h-[17px] w-[17px]"} aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate text-center font-semibold leading-tight text-[#374151]",
                      hero ? "text-xs" : "text-[10px]",
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn("border-t border-slate-100", hero ? "mt-4 pt-4" : "mt-3 pt-3")}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-center gap-2.5 rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(99,102,241,0.32)]",
                hero ? "h-12 px-4 text-[15px]" : "px-3.5 py-2.5 text-[13px]",
              )}
              style={{ background: BRAND_COLORS.gradient.primaryHex }}
              tabIndex={-1}
            >
              <Bookmark className={hero ? "h-[18px] w-[18px]" : "h-[15px] w-[15px]"} aria-hidden />
              {BRAND.applyCta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hero mock — full-column extension card (matches prior browser-window demo footprint). */
export function ExtensionCardMock() {
  return (
    <div className="relative w-full">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/30 to-mint/20 blur-3xl" />
      <div className="relative">
        <ExtensionCardPanel size="hero" />
      </div>
    </div>
  );
}
