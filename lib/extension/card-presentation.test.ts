import { describe, expect, it } from "vitest";
import {
  buildNoJobDetectedMetadata,
  NO_JOB_DETECTED_MESSAGE,
  NO_JOB_DETECTED_TITLE,
} from "@/src/shared/extension/card-presentation";

describe("card-presentation", () => {
  it("builds placeholder metadata for manual open on non-job pages", () => {
    const meta = buildNoJobDetectedMetadata();
    expect(meta.title).toBe(NO_JOB_DETECTED_TITLE);
    expect(meta.company).toBeNull();
    expect(NO_JOB_DETECTED_MESSAGE.length).toBeGreaterThan(20);
  });
});
