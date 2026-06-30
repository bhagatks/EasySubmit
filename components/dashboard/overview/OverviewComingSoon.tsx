import { Search, Zap } from "lucide-react";

const COMING_SOON_ITEMS = [
  {
    title: "Job Search",
    description: "Search across boards inside EasySubmit — no extension needed.",
    icon: Search,
  },
  {
    title: "One-click Apply",
    description: "Auto-fill applications across LinkedIn, Greenhouse, Lever and more.",
    icon: Zap,
  },
] as const;

export function OverviewComingSoon() {
  return (
    <section aria-label="Coming soon">
      <h2 className="mb-3 font-display text-base font-semibold">Coming soon</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {COMING_SOON_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-xl border border-dashed border-border/80 bg-surface/30 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                    <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Soon
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
