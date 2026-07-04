import { describe, expect, it } from "vitest";
import {
  buildPipelineStepViewModel,
  pairPipelineApiArtifacts,
} from "@/src/shared/extension/pipeline-debug-step-view";

describe("pairPipelineApiArtifacts", () => {
  it("pairs ai request and response by label prefix", () => {
    const pairs = pairPipelineApiArtifacts([
      { kind: "ai_request", label: "Max-ATS request", payload: { modelId: "opus" } },
      { kind: "ai_response", label: "Max-ATS response", payload: { tokensUsed: 100 } },
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.request?.label).toBe("Max-ATS request");
  });
});

describe("buildPipelineStepViewModel", () => {
  it("separates outcome artifacts from api exchanges", () => {
    const view = buildPipelineStepViewModel({
      id: "ai_pass1",
      group: "AI calls",
      label: "Max-ATS",
      description: "",
      trackerStage: "resume_prep",
      status: "done",
      detail: "done",
      artifacts: [
        { kind: "output", label: "Skills merge", payload: { skillsAdded: ["Python"] } },
        { kind: "ai_request", label: "Max-ATS request", payload: {} },
        { kind: "ai_response", label: "Max-ATS response", payload: {} },
      ],
    });
    expect(view.outcomeArtifacts).toHaveLength(1);
    expect(view.apiExchanges).toHaveLength(1);
  });
});
