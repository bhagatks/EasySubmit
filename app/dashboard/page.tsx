import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signup");
  }

  return (
    <main className="min-h-screen bg-simplifyBg px-6 py-12">
      <div className="mx-auto max-w-2xl rounded bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-simplifyDark">
          Welcome to EasySubmit
        </h1>
        <p className="mt-2 text-gray-600">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>
        <p className="mt-6 text-sm text-gray-500">
          Your onboarding profile has been saved. Dashboard features coming soon.
        </p>
      </div>
    </main>
  );
}
