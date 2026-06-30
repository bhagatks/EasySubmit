"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getAllHelpArticles,
  getArticleHref,
  HELP_CATEGORIES_BY_ID,
  searchHelpArticles,
} from "@/lib/help";

export function HelpSearch({ basePath = "/help" }: { basePath?: string }) {
  const [query, setQuery] = useState("");
  const articles = useMemo(() => getAllHelpArticles(), []);

  const results = useMemo(
    () => searchHelpArticles(articles, HELP_CATEGORIES_BY_ID, query),
    [articles, query],
  );

  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for articles…"
          className="h-12 rounded-xl border-border bg-surface/80 pl-12 text-base shadow-sm"
          aria-label="Search help articles"
        />
      </div>

      {query.trim().length > 0 ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-elevated">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No articles found.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map(({ article, category }) => (
                <li key={`${article.categoryId}-${article.slug}`}>
                  <Link
                    href={getArticleHref(article, basePath)}
                    className="block px-4 py-3 transition-colors hover:bg-muted/40"
                    onClick={() => setQuery("")}
                  >
                    <p className="text-sm font-medium text-foreground">{article.title}</p>
                    <p className="text-xs text-muted-foreground">{category.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
