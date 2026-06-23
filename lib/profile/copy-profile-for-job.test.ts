import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  copySourceProfileForJob,
  resolveSourceProfileForJob,
} from "@/lib/profile/copy-profile-for-job";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/profile/resume-profile-core", () => ({
  findDefaultProfile: vi.fn(),
  findProfileForUser: vi.fn(),
}));

vi.mock("@/lib/profile/studio-form-db", () => ({
  hubRefineryFormFromProfile: vi.fn(() => ({ firstName: "Ada" })),
}));

vi.mock("@/lib/profile/resume-profile-limit", () => ({
  checkUserCanCreateResumeProfile: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { findDefaultProfile, findProfileForUser } from "@/lib/profile/resume-profile-core";
import { checkUserCanCreateResumeProfile } from "@/lib/profile/resume-profile-limit";

const sourceProfile = {
  id: "source-1",
  userId: "user-1",
  isDefault: true,
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  phone: null,
  city: null,
  country: null,
  targetTitle: "Software Engineer",
  summary: "Builder",
  skills: ["TypeScript"],
  resumeRawText: "raw",
  content: {},
  calibrationScore: 80,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("copySourceProfileForJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkUserCanCreateResumeProfile).mockResolvedValue({
      ok: true,
      maxProfiles: 20,
      currentCount: 1,
    });
  });

  it("uses explicit sourceProfileId when provided", async () => {
    vi.mocked(findProfileForUser).mockResolvedValue(sourceProfile as never);
    vi.mocked(prisma.profile.create).mockResolvedValue({
      ...sourceProfile,
      id: "job-profile-1",
      isDefault: false,
      targetTitle: "Senior Engineer",
    } as never);

    const result = await copySourceProfileForJob("user-1", {
      sourceProfileId: "source-1",
      jobTitle: "Senior Engineer",
    });

    expect(findProfileForUser).toHaveBeenCalledWith("user-1", "source-1");
    expect(result).toMatchObject({
      success: true,
      profileId: "job-profile-1",
      sourceProfileId: "source-1",
      targetTitle: "Senior Engineer",
    });
    expect(prisma.profile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          isDefault: false,
          targetTitle: "Senior Engineer",
          email: "ada@example.com",
        }),
      }),
    );
  });

  it("falls back to default profile when sourceProfileId is missing", async () => {
    vi.mocked(findDefaultProfile).mockResolvedValue(sourceProfile as never);
    vi.mocked(prisma.profile.create).mockResolvedValue({
      ...sourceProfile,
      id: "job-profile-2",
      targetTitle: "Staff Engineer",
    } as never);

    const resolved = await resolveSourceProfileForJob("user-1", null);
    expect(resolved?.id).toBe("source-1");

    const result = await copySourceProfileForJob("user-1", {
      jobTitle: "Staff Engineer",
    });

    expect(findDefaultProfile).toHaveBeenCalledWith("user-1");
    expect(result.success).toBe(true);
  });

  it("fails when no source profile exists", async () => {
    vi.mocked(findDefaultProfile).mockResolvedValue(null);

    const result = await copySourceProfileForJob("user-1", {
      jobTitle: "Engineer",
    });

    expect(result).toEqual({
      success: false,
      error: "No resume profile to copy from",
      code: "no_source_profile",
    });
  });

  it("fails when job title is empty", async () => {
    const result = await copySourceProfileForJob("user-1", {
      jobTitle: "   ",
    });

    expect(result).toEqual({
      success: false,
      error: "Job title is required to create a tailored profile",
      code: "invalid_title",
    });
  });

  it("fails when profile limit is reached", async () => {
    vi.mocked(findDefaultProfile).mockResolvedValue(sourceProfile as never);
    vi.mocked(checkUserCanCreateResumeProfile).mockResolvedValue({
      ok: false,
      maxProfiles: 20,
      currentCount: 20,
      error: "You can have up to 20 resume profiles. Delete one to add another.",
    });

    const result = await copySourceProfileForJob("user-1", {
      jobTitle: "Engineer",
    });

    expect(result).toEqual({
      success: false,
      error: "You can have up to 20 resume profiles. Delete one to add another.",
      code: "profile_limit_reached",
    });
    expect(prisma.profile.create).not.toHaveBeenCalled();
  });
});
