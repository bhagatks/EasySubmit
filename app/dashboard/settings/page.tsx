import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getAccountSettings } from "@/app/actions/account";
import { listVaultedApiKeys } from "@/app/actions/ai/vault-key";
import { AccountSettings } from "@/components/dashboard/AccountSettings";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const [account, initialVaultKeys] = await Promise.all([
    getAccountSettings(),
    listVaultedApiKeys(),
  ]);

  if (!account) {
    redirect(
      `/api/auth/signout?callbackUrl=${encodeURIComponent("/login?signedOut=1&reason=stale-session")}`,
    );
  }

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading settings…</p>}>
      <AccountSettings initial={account} initialVaultKeys={initialVaultKeys} />
    </Suspense>
  );
}
