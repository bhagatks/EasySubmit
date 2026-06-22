import { prisma } from "@/lib/prisma";

export type ExtensionConnectedUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export async function getExtensionConnectedUser(
  userId: string,
): Promise<ExtensionConnectedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
