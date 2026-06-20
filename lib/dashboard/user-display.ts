export function getDisplayName(
  firstName?: string | null,
  email?: string | null,
  legacyFullName?: string | null,
): string {
  if (firstName?.trim()) {
    return firstName.trim();
  }

  if (legacyFullName?.trim()) {
    return legacyFullName.trim().split(/\s+/)[0] ?? legacyFullName.trim();
  }

  if (email?.trim()) {
    return email.split("@")[0] ?? "there";
  }

  return "there";
}

export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
  legacyFullName?: string | null,
): string {
  const given = firstName?.trim() ?? "";
  const family = lastName?.trim() ?? "";

  if (given && family) {
    return `${given[0] ?? ""}${family[0] ?? ""}`.toUpperCase();
  }

  if (given) {
    return given.slice(0, 2).toUpperCase();
  }

  if (legacyFullName?.trim()) {
    const parts = legacyFullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) ?? "ES").toUpperCase();
  }

  if (email?.trim()) {
    return email.slice(0, 2).toUpperCase();
  }

  return "ES";
}
