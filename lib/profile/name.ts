import { splitFullName } from "@/lib/resume/openResume/adapter";

export function joinProfileName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, lastName].map((part) => part?.trim()).filter(Boolean).join(" ");
}

export function parseProfileName(fullName?: string | null): {
  firstName: string;
  lastName: string;
} {
  return splitFullName(fullName ?? "");
}
