import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listJobTrackerEntries } from "@/app/actions/job-tracker";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await listJobTrackerEntries();
  if (!result.success) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result);
}
