import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HelpCategory } from "@/lib/help/types";
import { getArticlesForCategory } from "@/lib/help/content";

type HelpCategoryGridProps = {
  categories: HelpCategory[];
  basePath?: string;
};

export function HelpCategoryGrid({ categories, basePath = "/help" }: HelpCategoryGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {categories.map((category) => {
        const Icon = category.icon;
        const count = getArticlesForCategory(category.id).length;

        return (
          <Link
            key={category.id}
            href={`${basePath}/${category.id}`}
            className="group rounded-xl border border-border bg-surface/60 p-5 transition hover:border-primary/40 hover:bg-surface"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-semibold text-foreground">{category.title}</h2>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {count} {count === 1 ? "article" : "articles"}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
