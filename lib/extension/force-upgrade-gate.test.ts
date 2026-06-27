import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import {
  EXTENSION_FORCE_UPGRADE_DEFAULTS,
} from "@/src/lib/services/extension-force-upgrade-config";
import { EXTENSION_VERSION_HEADER } from "@/src/shared/extension/constants";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  extensionForceUpgradeResponse,
  isExtensionVersionBlocked,
} from "@/lib/extension/force-upgrade-gate";

function requestWithVersion(version: string | null): NextRequest {
  const headers = new Headers();
  if (version) headers.set(EXTENSION_VERSION_HEADER, version);
  return { headers } as NextRequest;
}

describe("isExtensionVersionBlocked", () => {
  it("blocks when enabled and version is below minimum", () => {
    expect(
      isExtensionVersionBlocked(
        { ...EXTENSION_FORCE_UPGRADE_DEFAULTS, enabled: true, minVersion: "0.3.0" },
        "0.2.6",
      ),
    ).toBe(true);
  });

  it("allows when disabled or version meets minimum", () => {
    expect(
      isExtensionVersionBlocked(
        { ...EXTENSION_FORCE_UPGRADE_DEFAULTS, enabled: false, minVersion: "0.3.0" },
        "0.1.0",
      ),
    ).toBe(false);
    expect(
      isExtensionVersionBlocked(
        { ...EXTENSION_FORCE_UPGRADE_DEFAULTS, enabled: true, minVersion: "0.2.6" },
        "0.2.6",
      ),
    ).toBe(false);
  });
});

describe("extensionForceUpgradeResponse", () => {
  beforeEach(() => {
    vi.mocked(prisma.appConfig.findUnique).mockResolvedValue({
      key: "forceUpgrade",
      value: {
        enabled: true,
        minVersion: "0.3.0",
        updateUrl: "/extension",
        message: "Update the extension.",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("returns 426 when version header is too old", async () => {
    const res = await extensionForceUpgradeResponse(requestWithVersion("0.2.6"));
    expect(res?.status).toBe(426);
    const body = await res?.json();
    expect(body.code).toBe("EXTENSION_UPDATE_REQUIRED");
    expect(body.minExtensionVersion).toBe("0.3.0");
  });

  it("returns null when version meets minimum", async () => {
    const res = await extensionForceUpgradeResponse(requestWithVersion("0.3.0"));
    expect(res).toBeNull();
  });
});
