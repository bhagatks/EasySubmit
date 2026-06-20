import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { listVaultedApiKeys } from "@/app/actions/ai/vault-key";
import { authOptions } from "@/lib/auth";
import { requireDashboardSession } from "@/lib/auth/require-dashboard-session";
import { AiKeysManager } from "@/components/dashboard/AiKeysManager";

export default async function KeysPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await requireDashboardSession(session.user.id);

  const initialKeys = await listVaultedApiKeys();

  return <AiKeysManager initialKeys={initialKeys} />;
}
