import { buildOnboardingPayload, isOnboardingComplete } from "@/lib/onboarding/payload";
import { finalizeProfile } from "@/lib/profile/finalizeProfile";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const payloadRaw = formData.get("payload");

    if (typeof payloadRaw !== "string") {
      return NextResponse.json({ error: "Missing onboarding payload" }, { status: 400 });
    }

    const parsed = JSON.parse(payloadRaw) as ReturnType<typeof buildOnboardingPayload>;
    const resumeFile = formData.get("resume");

    if (!isOnboardingComplete(parsed)) {
      return NextResponse.json(
        { error: "Incomplete onboarding data" },
        { status: 400 }
      );
    }

    const profile = await finalizeProfile(
      user.id,
      user.email,
      parsed,
      resumeFile instanceof File ? resumeFile : null
    );

    return NextResponse.json({ success: true, profileId: profile.id });
  } catch (error) {
    console.error("finalizeProfile error:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
