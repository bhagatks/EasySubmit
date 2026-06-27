export function DashboardRouteFallback() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <div
        className="hidden w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border/60 md:flex"
        aria-hidden="true"
      >
        <div className="h-14 shrink-0 border-b border-border/60" />
        <div className="flex-1" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="h-14 shrink-0 border-b border-border/60" aria-hidden="true" />
        <main className="flex flex-1 flex-col p-6">
          <div className="animate-pulse space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-52 max-w-full rounded-lg bg-muted" />
              <div className="h-4 w-72 max-w-full rounded bg-muted/80" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-2xl bg-muted/70" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-52 max-w-full rounded-lg bg-muted" />
        <div className="h-4 w-72 max-w-full rounded bg-muted/80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-muted/70" />
        ))}
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="min-h-[22rem] rounded-2xl bg-muted/60" />
        <div className="min-h-[22rem] rounded-2xl bg-muted/60" />
      </div>
    </div>
  );
}
