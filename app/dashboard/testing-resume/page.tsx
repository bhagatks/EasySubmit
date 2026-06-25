import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listResumeProfiles, getResumeProfileStudio } from "@/app/actions/resume-profiles";
import { TestingResumeWorkspace } from "@/components/dashboard/dev/TestingResumeWorkspace";

export default async function TestingResumePage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const listResult = await listResumeProfiles();
  if (!listResult.success) redirect("/login");

  const { profiles } = listResult;

  const formEntries = await Promise.all(
    profiles.map(async (p) => {
      const r = await getResumeProfileStudio(p.id);
      return r.success ? ([p.id, r.form] as const) : null;
    }),
  );

  const profileForms = Object.fromEntries(formEntries.filter((e) => e !== null));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Resume enhancement tester</h1>
        <p className="text-xs text-muted-foreground">Dev only — real pipeline, no DB writes</p>
      </div>
      <TestingResumeWorkspace profiles={profiles} profileForms={profileForms} />
    </div>
  );
}
