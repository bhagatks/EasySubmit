import { describe, expect, it } from "vitest";
import {
  claimsFromIdToken,
  mergeOAuthClaims,
  oauthClaimsFromSignIn,
} from "@/lib/auth/oauth-claims";

function buildIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("oauth-claims", () => {
  it("extracts given_name and family_name from id_token", () => {
    const token = buildIdToken({
      name: "Jane Doe",
      given_name: "Jane",
      family_name: "Doe",
    });

    expect(claimsFromIdToken(token)).toEqual({
      name: "Jane Doe",
      given_name: "Jane",
      family_name: "Doe",
    });
  });

  it("merges profile, id_token, and user name with id_token winning gaps", () => {
    const token = buildIdToken({
      name: "Jane Doe",
      given_name: "Jane",
      family_name: "Doe",
    });

    expect(
      oauthClaimsFromSignIn({
        profile: { name: "Jane", given_name: "Jane" },
        idToken: token,
        userName: "Jane",
      }),
    ).toEqual({
      name: "Jane Doe",
      given_name: "Jane",
      family_name: "Doe",
      picture: null,
    });
  });

  it("mergeOAuthClaims fills missing family_name from later sources", () => {
    expect(
      mergeOAuthClaims(
        { name: "Jane", given_name: "Jane" },
        { name: "Jane Doe", family_name: "Doe" },
      ),
    ).toEqual({
      name: "Jane",
      given_name: "Jane",
      family_name: "Doe",
    });
  });
});
