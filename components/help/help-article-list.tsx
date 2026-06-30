import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HelpArticle } from "@/lib/help/types";
import { getArticleHref } from "@/lib/help/content";

type HelpArticleListProps = {
  articles: HelpArticle[];
  basePath?: string;
};

export function HelpArticleList({ articles, basePath = "/help" }: HelpArticleListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface/60">
      {articles.map((article) => (
        <li key={article.slug}>
          <Link
            href={getArticleHref(article, basePath)}
            className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-muted/30"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{article.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
