import type { HelpArticle, HelpCategory, HelpSearchResult } from "@/lib/help/types";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

function scoreArticle(article: HelpArticle, query: string): number {
  const normalized = normalizeQuery(query);
  if (!normalized) return 0;

  const haystack = [article.title, article.summary, ...flattenBlocks(article.blocks)]
    .join(" ")
    .toLowerCase();

  if (haystack.includes(normalized)) {
    return article.title.toLowerCase().includes(normalized) ? 100 : 60;
  }

  const tokens = tokenize(normalized);
  if (tokens.length === 0) return 0;

  let score = 0;
  for (const token of tokens) {
    if (article.title.toLowerCase().includes(token)) score += 30;
    if (article.summary.toLowerCase().includes(token)) score += 15;
    if (haystack.includes(token)) score += 8;
  }

  return score;
}

function flattenBlocks(blocks: HelpArticle["blocks"]): string[] {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "h2":
      case "h3":
        parts.push(block.text);
        break;
      case "p":
        parts.push(...block.inlines.map((inline) => ("value" in inline ? inline.value : inline.label)));
        break;
      case "ul":
        for (const item of block.items) {
          parts.push(typeof item === "string" ? item : item.inlines.map((i) => i.value ?? i.label).join(" "));
        }
        break;
      default:
        break;
    }
  }
  return parts;
}

export function searchHelpArticles(
  articles: HelpArticle[],
  categoriesById: Record<string, HelpCategory>,
  query: string,
  limit = 12,
): HelpSearchResult[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  return articles
    .map((article) => ({
      article,
      category: categoriesById[article.categoryId],
      score: scoreArticle(article, normalized),
    }))
    .filter((result) => result.score > 0 && result.category)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
    .slice(0, limit);
}
