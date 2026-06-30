import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import { HELP_PROSE_CLASS } from "@/components/help/help-prose";
import { HelpShell } from "@/components/help/help-shell";
import { LegalDocumentRenderer } from "@/components/legal/legal-document-renderer";
import { BRAND } from "@/lib/brand";
import {
  getArticleHref,
  getArticlesForCategory,
  getHelpArticle,
  getHelpCategory,
} from "@/lib/help";
import { cn } from "@/lib/utils";

type HelpArticlePageProps = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: HelpArticlePageProps): Promise<Metadata> {
  const { category: categoryId, slug } = await params;
  const article = getHelpArticle(categoryId, slug);
  if (!article) {
    return { title: `Help Center | ${BRAND.full}` };
  }

  return {
    title: `${article.title} | Help Center | ${BRAND.full}`,
    description: article.summary,
  };
}

export default async function HelpArticlePage({ params }: HelpArticlePageProps) {
  const { category: categoryId, slug } = await params;
  const category = getHelpCategory(categoryId);
  const article = getHelpArticle(categoryId, slug);

  if (!category || !article) {
    notFound();
  }

  const related = getArticlesForCategory(categoryId)
    .filter((item) => item.slug !== slug)
    .slice(0, 3);

  return (
    <HelpShell backHref={`/help/${categoryId}`} backLabel={category.title}>
      <HelpBreadcrumbs
        items={[
          { label: "Help", href: "/help" },
          { label: category.title, href: `/help/${categoryId}` },
          { label: article.title },
        ]}
      />

      <article className={cn(HELP_PROSE_CLASS, "max-w-3xl")}>
        <p className="text-sm text-muted-foreground">
          {category.title}
          {article.updatedLabel ? ` · ${article.updatedLabel}` : null}
        </p>
        <h1 className="!mt-2">{article.title}</h1>
        <p className="text-base">{article.summary}</p>
        <LegalDocumentRenderer blocks={article.blocks} />
      </article>

      {related.length > 0 ? (
        <section className="mt-12 max-w-3xl border-t border-border pt-8">
          <h2 className="font-display text-lg font-semibold text-foreground">Related articles</h2>
          <ul className="mt-4 space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={getArticleHref(item)}
                  className="text-sm text-primary hover:underline"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </HelpShell>
  );
}
