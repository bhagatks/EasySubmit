const inflightByKey = new Map<string, Promise<unknown>>();

/** One in-flight JD AI extract per key (typically userId:jobEntryId:descriptionHash). */
export function runInflightJdExtract<T>(key: string, execute: () => Promise<T>): Promise<T> {
  const existing = inflightByKey.get(key);
  if (existing) return existing as Promise<T>;

  const promise = execute().finally(() => {
    if (inflightByKey.get(key) === promise) {
      inflightByKey.delete(key);
    }
  });
  inflightByKey.set(key, promise);
  return promise;
}

/** @internal tests */
export function resetInflightJdExtractForTests(): void {
  inflightByKey.clear();
}
