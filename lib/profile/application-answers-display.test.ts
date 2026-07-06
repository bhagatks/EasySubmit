import { describe, expect, it } from "vitest";
import {
  formatStoredAnswerDisplay,
  parseStoredAnswerEdit,
  storedAnswerIsEditable,
} from "@/lib/profile/application-answers-display";

describe("formatStoredAnswerDisplay", () => {
  it("formats text, boolean, option, and file_ref answers", () => {
    expect(formatStoredAnswerDisplay({ kind: "text", value: "Remote" })).toBe("Remote");
    expect(formatStoredAnswerDisplay({ kind: "boolean", value: true })).toBe("Yes");
    expect(
      formatStoredAnswerDisplay({ kind: "option", value: "opt-1", optionLabel: "United States" }),
    ).toBe("United States");
    expect(
      formatStoredAnswerDisplay({ kind: "file_ref", source: "profile_resume", profileId: "p1" }),
    ).toBe("Profile resume");
  });
});

describe("parseStoredAnswerEdit", () => {
  it("updates text answers", () => {
    expect(parseStoredAnswerEdit({ kind: "text", value: "old" }, " new ")).toEqual({
      kind: "text",
      value: "new",
    });
  });

  it("parses boolean edits", () => {
    expect(parseStoredAnswerEdit({ kind: "boolean", value: false }, "yes")).toEqual({
      kind: "boolean",
      value: true,
    });
    expect(parseStoredAnswerEdit({ kind: "boolean", value: true }, "nope")).toBeNull();
  });

  it("rejects file_ref edits", () => {
    expect(
      parseStoredAnswerEdit(
        { kind: "file_ref", source: "profile_resume", profileId: "p1" },
        "anything",
      ),
    ).toBeNull();
  });
});

describe("storedAnswerIsEditable", () => {
  it("allows text-like answers only", () => {
    expect(storedAnswerIsEditable({ kind: "text", value: "a" })).toBe(true);
    expect(
      storedAnswerIsEditable({ kind: "file_ref", source: "profile_resume", profileId: "p1" }),
    ).toBe(false);
  });
});
