/** One HTTP exchange captured for pipeline QA (O*NET, ESCO, etc.). */
export type ExternalApiDebugExchange = {
  label: string;
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
  };
  response: {
    status: number | null;
    ok: boolean;
    body?: unknown;
    error?: string;
  };
};

export type FetchRoleVocabularyOptions = {
  /** When set, records each live HTTP call (skipped on cache hit). */
  apiDebug?: ExternalApiDebugExchange[];
};
