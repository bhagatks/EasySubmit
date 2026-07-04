import { describe, expect, it } from "vitest";
import {
  externalApiArtifactsFromExchanges,
  externalRequestArtifact,
  externalResponseArtifact,
} from "@/lib/extension/pipeline-debug-sanitize";

describe("external API pipeline artifacts", () => {
  it("builds paired request and response artifacts", () => {
    const artifacts = externalApiArtifactsFromExchanges([
      {
        label: "Skill extraction",
        request: {
          method: "GET",
          url: "https://api.example.com/skills?keyword=engineer",
          headers: { Accept: "application/json", Authorization: "secret" },
        },
        response: { status: 200, ok: true, body: { skills: ["Leadership", "Communication"] } },
      },
    ]);

    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]?.kind).toBe("external_request");
    expect(artifacts[1]?.kind).toBe("external_response");
    expect(artifacts[0]?.label).toBe("Skill extraction request");
    expect(artifacts[1]?.label).toBe("Skill extraction response");
  });

  it("redacts sensitive request headers", () => {
    const artifact = externalRequestArtifact("Occupation search request", {
      method: "GET",
      url: "https://example.test",
      headers: { Authorization: "Basic abc", Accept: "application/json" },
    });

    expect(artifact.payload).toMatchObject({
      requestHeaders: { Authorization: "[redacted]", Accept: "application/json" },
    });
  });

  it("includes response status and body preview", () => {
    const artifact = externalResponseArtifact("Occupation search response", {
      status: 404,
      ok: false,
      body: { error: "not found" },
    });

    expect(artifact.kind).toBe("external_response");
    expect(artifact.payload).toMatchObject({
      status: 404,
      ok: false,
      bodyPreview: { error: "not found" },
    });
  });
});
