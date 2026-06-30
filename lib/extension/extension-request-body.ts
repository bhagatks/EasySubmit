/** Extension POST bodies: description cap + metadata — reject abuse before JSON.parse. */
export const MAX_EXTENSION_JSON_BODY_BYTES = 600_000;

type ParsedBody<T> =
  | { ok: true; body: T }
  | { ok: false; response: Response };

export async function readExtensionJsonBody<T>(request: Request): Promise<ParsedBody<T>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_EXTENSION_JSON_BODY_BYTES) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "Request body too large" },
        { status: 413 },
      ),
    };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      response: Response.json({ success: false, error: "Invalid request body" }, { status: 400 }),
    };
  }

  if (raw.length > MAX_EXTENSION_JSON_BODY_BYTES) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "Request body too large" },
        { status: 413 },
      ),
    };
  }

  try {
    return { ok: true, body: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      response: Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}
