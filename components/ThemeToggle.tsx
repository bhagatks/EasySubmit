"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type ThemeValue = (typeof themes)[number]["value"];

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="inline-flex rounded-[12px] border border-brand-border bg-card p-1 shadow-sm"
        aria-hidden
      >
        <div className="h-9 w-[252px] rounded-[12px] bg-background" />
      </div>
    );
  }

  const activeTheme = (theme ?? "system") as ThemeValue;

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex rounded-[12px] border border-brand-border bg-card p-1 shadow-sm"
    >
      {themes.map(({ value, label, icon: Icon }) => {
        const isActive = activeTheme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            aria-label={`${label} theme`}
            className={[
              "inline-flex items-center gap-1.5 rounded-[12px] border px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-foreground hover:bg-background",
            ].join(" ")}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
