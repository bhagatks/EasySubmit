import { listVaultedApiKeys } from "@/app/actions/ai/vault-key";
import { AiKeysManager } from "@/components/dashboard/AiKeysManager";

export default async function KeysPage() {
  const initialKeys = await listVaultedApiKeys();

  return <AiKeysManager initialKeys={initialKeys} />;
}
