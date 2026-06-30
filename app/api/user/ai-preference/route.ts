import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiSourcePreference: true },
  });

  return NextResponse.json({
    aiSourcePreference: user?.aiSourcePreference ?? "auto",
    aiGloballyEnabled: isAiGloballyEnabled(),
  });
}
