import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinProfileName } from "@/lib/profile/name";

export default async function ResumeProfilesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      targetTitle: true,
      updatedAt: true,
    },
  });

  const displayName =
    joinProfileName(profile?.firstName, profile?.lastName) || "Default profile";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Resume profiles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Career data used for resumes and autofill — separate from your login account.
          </p>
        </div>
        {/* + icon for additional profiles — wired in a follow-up */}
        <button
          type="button"
          disabled
          title="Additional profiles coming soon"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground opacity-50"
          aria-label="Add resume profile (coming soon)"
        >
          +
        </button>
      </div>

      {profile ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {profile.targetTitle ?? "No target role yet"}
              </p>
            </div>
            <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
              Default
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated {profile.updatedAt.toLocaleDateString()}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No resume profile yet. Complete onboarding to create your default profile.
        </div>
      )}
    </div>
  );
}
