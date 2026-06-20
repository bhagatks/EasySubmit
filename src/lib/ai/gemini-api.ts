import { getProviderHandshakeUrl } from "@/src/lib/config/app.config";

/** Google REST + auth (`AQ.`) keys — use header, not `?key=` query (legacy `AIza` only). */
export function geminiApiHeaders(apiKey: string): HeadersInit {
  return {
    "x-goog-api-key": apiKey.trim(),
  };
}

export function geminiModelsListUrl(): string {
  return getProviderHandshakeUrl("gemini");
}
