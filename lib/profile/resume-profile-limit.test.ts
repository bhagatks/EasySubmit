import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/src/lib/services/config-service", () => ({
  getAppConfig: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/src/lib/services/config-service";
import {
  checkUserCanCreateResumeProfile,
  formatResumeProfileLimitError,
} from "@/lib/profile/resume-profile-limit";

describe("resume profile limit", () => {
  beforeEach(() => {
    vi.mocked(prisma.profile.count).mockReset();
    vi.mocked(getAppConfig).mockReset();
    vi.mocked(getAppConfig).mockResolvedValue({ maxProfilesPerCustomer: 20 } as never);
  });

  it("formats limit error message", () => {
    expect(formatResumeProfileLimitError(20)).toContain("20");
    expect(formatResumeProfileLimitError(1)).toContain("profile.");
  });

  it("allows create when under limit", async () => {
    vi.mocked(prisma.profile.count).mockResolvedValue(3);

    const result = await checkUserCanCreateResumeProfile("user-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.maxProfiles).toBe(20);
      expect(result.currentCount).toBe(3);
    }
  });

  it("blocks create at limit", async () => {
    vi.mocked(prisma.profile.count).mockResolvedValue(20);

    const result = await checkUserCanCreateResumeProfile("user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("20");
    }
  });

  it("uses maxProfiles override without loading config", async () => {
    vi.mocked(prisma.profile.count).mockResolvedValue(5);

    const result = await checkUserCanCreateResumeProfile("user-1", prisma, 10);

    expect(getAppConfig).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.maxProfiles).toBe(10);
      expect(result.currentCount).toBe(5);
    }
  });

  it("requires maxProfiles override when using a transaction client", async () => {
    const tx = {
      profile: {
        count: vi.fn(),
      },
    };

    await expect(
      checkUserCanCreateResumeProfile("user-1", tx as never),
    ).rejects.toThrow("maxProfilesOverride is required");
  });
});
