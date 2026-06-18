import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-surface p-8 shadow-elevated">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Welcome to EasySubmit
        </h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{session.user.email}</span>
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Your onboarding profile has been saved. Dashboard features coming soon.
        </p>
      </div>
    </main>
  );
}
