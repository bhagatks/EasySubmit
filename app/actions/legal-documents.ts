"use server";

import { getAppConfig } from "@/src/lib/services/config-service";
import type { LegalDocumentsConfig } from "@/src/lib/services/legal-documents-config";

export async function getLegalDocuments(): Promise<LegalDocumentsConfig> {
  return getAppConfig("legalDocuments");
}
