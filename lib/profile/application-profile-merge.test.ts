import { describe, expect, it, vi, beforeEach } from "vitest";
import { mergeApplicationProfile } from "@/lib/profile/application-profile-setup";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { patchApplicationProfileForUser } from "@/lib/profile/application-profile-merge";

describe("patchApplicationProfileForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges top-level keys via JSONB || without dropping unrelated sections", async () => {
    const storedProfile = {
      workAuth: {
        authorized: true,
        authorizedCountry: "US",
        requiresSponsorship: false,
      },
      preferences: {
        salary: { min: 100_000, max: 140_000, currency: "USD", signals: [] },
        earliestStart: "2_weeks",
        workMode: "remote",
      },
      address: null,
      eeo: null,
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      applicationProfile: {
        ...storedProfile,
        eeo: {
          gender: "Prefer not to say",
          veteran: "Prefer not to say",
          disability: "Prefer not to say",
        },
      },
    } as never);

    const result = await patchApplicationProfileForUser("user-1", {
      eeo: {
        gender: "Prefer not to say",
        veteran: "Prefer not to say",
        disability: "Prefer not to say",
      },
    });

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(result.workAuth?.authorizedCountry).toBe("US");
    expect(result.preferences?.workMode).toBe("remote");
    expect(result.eeo?.gender).toBe("Prefer not to say");
  });

  it("returns current profile when patch is empty", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      applicationProfile: mergeApplicationProfile(null, {
        workAuth: {
          authorized: true,
          authorizedCountry: "US",
          requiresSponsorship: false,
        },
      }),
    } as never);

    const result = await patchApplicationProfileForUser("user-1", {});
    expect(result.workAuth?.authorized).toBe(true);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
