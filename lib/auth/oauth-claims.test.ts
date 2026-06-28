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

describe("claimsFromIdToken edge cases", () => {
  it("returns empty object for null", () => {
    expect(claimsFromIdToken(null)).toEqual({});
  });

  it("returns empty object for token with fewer than 2 segments", () => {
    expect(claimsFromIdToken("onlyone")).toEqual({});
  });

  it("returns empty object for invalid base64 payload", () => {
    expect(claimsFromIdToken("header.!!!.sig")).toEqual({});
  });

  it("skips non-string claim values", () => {
    const header = Buffer.from("{}").toString("base64url");
    const body = Buffer.from(JSON.stringify({ given_name: 123, name: "   " })).toString("base64url");
    expect(claimsFromIdToken(`${header}.${body}.sig`)).toEqual({
      name: null,
      given_name: null,
      family_name: null,
    });
  });
});

describe("mergeOAuthClaims", () => {
  it("skips null sources", () => {
    expect(mergeOAuthClaims(null, { name: "Jane" })).toEqual({ name: "Jane" });
  });
});

describe("oauthClaimsFromSignIn", () => {
  it("uses userImage when profile has no picture", () => {
    const result = oauthClaimsFromSignIn({ userImage: "http://img.example.com/x.jpg" });
    expect(result.picture).toBe("http://img.example.com/x.jpg");
  });

  it("returns null picture when neither profile nor userImage present", () => {
    const result = oauthClaimsFromSignIn({});
    expect(result.picture).toBeNull();
  });
});

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
