import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { listResumeProfiles } from "@/app/actions/resume-profiles";
import { ResumeProfilesList } from "@/components/dashboard/ResumeProfilesList";
import { Button } from "@/components/ui/button";

export default async function ResumeProfilesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const result = await listResumeProfiles();

  if (!result.success) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Resume profiles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Career profiles for autofill — separate from your login. Role labels the list; contact name is secondary.
          </p>
        </div>
        <Button variant="hero" size="icon" className="h-10 w-10 rounded-xl shrink-0" asChild>
          <Link href="/dashboard/resume-profiles/new" aria-label="Add resume profile">
            +
          </Link>
        </Button>
      </div>

      {result.profiles.length > 0 ? (
        <ResumeProfilesList profiles={result.profiles} canDelete={result.canDelete} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No resume profile yet. Complete onboarding to create your default profile.
          </p>
          <Button variant="hero" className="mt-4 rounded-xl" asChild>
            <Link href="/onboarding">Continue onboarding</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
