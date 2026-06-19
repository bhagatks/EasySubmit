import { buildOnboardingPayload, isOnboardingComplete } from "@/lib/onboarding/payload";
import { finalizeProfile } from "@/lib/profile/finalizeProfile";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id ?? session.user.email;
    const email = session.user.email;

    const formData = await request.formData();
    const payloadRaw = formData.get("payload");

    if (typeof payloadRaw !== "string") {
      return NextResponse.json({ error: "Missing onboarding payload" }, { status: 400 });
    }

    const parsed = JSON.parse(payloadRaw) as ReturnType<typeof buildOnboardingPayload>;

    if (!isOnboardingComplete(parsed)) {
      return NextResponse.json(
        { error: "Incomplete onboarding data" },
        { status: 400 },
      );
    }

    const profile = await finalizeProfile(userId, email, parsed);

    return NextResponse.json({ success: true, profileId: profile.id });
  } catch (error) {
    console.error("finalizeProfile error:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
