import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  signSupabaseRealtimeToken,
} from "@/lib/supabase/realtime-token";

describe("signSupabaseRealtimeToken", () => {
  it("returns null when SUPABASE_JWT_SECRET is missing", () => {
    const previous = process.env.SUPABASE_JWT_SECRET;
    delete process.env.SUPABASE_JWT_SECRET;
    expect(signSupabaseRealtimeToken("user-1")).toBeNull();
    if (previous) process.env.SUPABASE_JWT_SECRET = previous;
  });

  it("returns a three-part JWT when secret is set", () => {
    process.env.SUPABASE_JWT_SECRET = "test-realtime-secret";
    const token = signSupabaseRealtimeToken("user-abc");
    expect(token?.split(".")).toHaveLength(3);
  });

  it("uses HS256 signature", () => {
    process.env.SUPABASE_JWT_SECRET = "test-realtime-secret";
    const token = signSupabaseRealtimeToken("user-abc", 60);
    expect(token).toBeTruthy();
    const [header, payload, signature] = token!.split(".");
    const unsigned = `${header}.${payload}`;
    const expected = createHmac("sha256", "test-realtime-secret")
      .update(unsigned)
      .digest("base64url");
    expect(signature).toBe(expected);
  });
});
