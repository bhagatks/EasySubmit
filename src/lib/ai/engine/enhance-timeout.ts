export class EnhanceTimeoutError extends Error {
  readonly code = "timeout" as const;

  constructor(
    readonly timeoutMs: number,
    readonly traceId: string,
  ) {
    super(`Enhance request timed out after ${timeoutMs}ms`);
    this.name = "EnhanceTimeoutError";
  }
}

export function isEnhanceTimeoutError(error: unknown): error is EnhanceTimeoutError {
  return error instanceof EnhanceTimeoutError;
}

/**
 * Race a promise against a client-side enhance timeout.
 * Does not cancel the underlying server work — logs so operators can correlate.
 */
export function raceWithEnhanceTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  traceId: string,
): Promise<T> {
  if (timeoutMs <= 0) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new EnhanceTimeoutError(timeoutMs, traceId));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
