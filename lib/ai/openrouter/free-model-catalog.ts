export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export type OpenRouterModelListing = {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
};

export function isOpenRouterFreeModelId(modelId: string): boolean {
  return modelId.trim().endsWith(":free");
}

export function filterOpenRouterFreeModelIds(modelIds: string[]): string[] {
  const seen = new Set<string>();
  const free: string[] = [];
  for (const raw of modelIds) {
    const id = raw.trim();
    if (!id || !isOpenRouterFreeModelId(id) || seen.has(id)) continue;
    seen.add(id);
    free.push(id);
  }
  return free.sort((a, b) => a.localeCompare(b));
}

export function parseOpenRouterModelsListPayload(payload: unknown): OpenRouterModelListing[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const listings: OpenRouterModelListing[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const id = typeof (row as { id?: unknown }).id === "string" ? (row as { id: string }).id.trim() : "";
    if (!id) continue;
    listings.push({
      id,
      name: typeof (row as { name?: unknown }).name === "string" ? (row as { name: string }).name : undefined,
      pricing:
        (row as { pricing?: OpenRouterModelListing["pricing"] }).pricing ?? undefined,
    });
  }
  return listings;
}

export function extractOpenRouterFreeModelIds(payload: unknown): string[] {
  return filterOpenRouterFreeModelIds(
    parseOpenRouterModelsListPayload(payload).map((model) => model.id),
  );
}

export async function fetchOpenRouterFreeModelIds(input: {
  apiKey: string;
  fetchFn?: typeof fetch;
}): Promise<string[]> {
  const fetchImpl = input.fetchFn ?? fetch;
  const response = await fetchImpl(OPENROUTER_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${input.apiKey.trim()}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenRouter models list failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as unknown;
  return extractOpenRouterFreeModelIds(payload);
}
