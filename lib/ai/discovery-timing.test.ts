import { describe, expect, it, vi } from "vitest";
import {
  isDiscoveryCacheFresh,
  minutesToMilliseconds,
  readLastDiscoveryTimestamp,
  writeLastDiscoveryTimestamp,
  LAST_DISCOVERY_STORAGE_KEY,
} from "@/src/lib/ai/discovery-timing";

describe("discovery-timing", () => {
  it("converts refresh interval minutes to milliseconds", () => {
    expect(minutesToMilliseconds(1440)).toBe(86_400_000);
  });

  it("treats discovery as fresh inside the interval window", () => {
    const now = Date.now();
    const lastDiscovery = now - minutesToMilliseconds(60);

    expect(isDiscoveryCacheFresh(lastDiscovery, 1440, now)).toBe(true);
  });

  it("treats discovery as stale after the interval window", () => {
    const now = Date.now();
    const lastDiscovery = now - minutesToMilliseconds(1440) - 1;

    expect(isDiscoveryCacheFresh(lastDiscovery, 1440, now)).toBe(false);
  });

  it("reads and writes lastDiscovery in localStorage", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });

    expect(readLastDiscoveryTimestamp()).toBeNull();

    writeLastDiscoveryTimestamp(1_700_000_000_000);
    expect(storage.get(LAST_DISCOVERY_STORAGE_KEY)).toBe("1700000000000");
    expect(readLastDiscoveryTimestamp()).toBe(1_700_000_000_000);
  });
});
