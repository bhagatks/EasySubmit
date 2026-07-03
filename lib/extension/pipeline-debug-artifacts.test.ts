import { describe, expect, it } from "vitest";
import { mergePipelineDebugArtifacts } from "@/src/shared/extension/pipeline-debug-artifacts";
import { sanitizePipelineDebugArtifacts } from "@/lib/extension/pipeline-debug-sanitize";

describe("pipeline debug artifacts", () => {
  it("merges artifacts by label", () => {
    const merged = mergePipelineDebugArtifacts(
      [{ kind: "data", label: "A", payload: { v: 1 } }],
      [{ kind: "output", label: "A", payload: { v: 2 } }, { kind: "flags", label: "Flags", payload: { on: true } }],
    );
    expect(merged).toHaveLength(2);
    expect(merged?.find((row) => row.label === "A")?.payload).toEqual({ v: 2 });
  });

  it("strips blocked keys from artifact payloads", () => {
    const sanitized = sanitizePipelineDebugArtifacts([
      {
        kind: "input",
        label: "Profile",
        payload: { email: "secret@example.com", skillsTextPreview: "React, TypeScript" },
      },
    ]);
    expect(sanitized?.[0]?.payload).toEqual({ skillsTextPreview: "React, TypeScript" });
  });
});
