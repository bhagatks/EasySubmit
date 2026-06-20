import type { OAuthProfileClaims } from "@/lib/auth/extract-login-identity";

type UnknownRecord = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Decode Google/LinkedIn OIDC id_token payload for name claims (JWT middle segment). */
export function claimsFromIdToken(idToken?: string | null): OAuthProfileClaims {
  if (!idToken) {
    return {};
  }

  const segments = idToken.split(".");
  if (segments.length < 2) {
    return {};
  }

  try {
    const payload = JSON.parse(
      Buffer.from(segments[1], "base64url").toString("utf8"),
    ) as UnknownRecord;

    return {
      name: asString(payload.name),
      given_name: asString(payload.given_name),
      family_name: asString(payload.family_name),
    };
  } catch {
    return {};
  }
}

export function mergeOAuthClaims(
  ...sources: Array<OAuthProfileClaims | null | undefined>
): OAuthProfileClaims {
  const merged: OAuthProfileClaims = {};

  for (const source of sources) {
    if (!source) continue;
    if (!merged.name && source.name) merged.name = source.name;
    if (!merged.given_name && source.given_name) merged.given_name = source.given_name;
    if (!merged.family_name && source.family_name) merged.family_name = source.family_name;
  }

  return merged;
}

export function oauthClaimsFromSignIn(input: {
  profile?: unknown;
  idToken?: string | null;
  userName?: string | null;
  userImage?: string | null;
}): OAuthProfileClaims & { picture?: string | null } {
  const oauthProfile = (input.profile ?? {}) as OAuthProfileClaims & {
    picture?: string | null;
  };
  const idClaims = claimsFromIdToken(input.idToken);
  const merged = mergeOAuthClaims(idClaims, oauthProfile, {
    name: input.userName,
  });

  return {
    ...merged,
    picture: oauthProfile.picture ?? input.userImage ?? null,
  };
}
