export const POPULAR_ROLES = [
  "Software Engineering",
  "Data Science",
  "Product Management",
  "UX / UI Design",
  "Marketing",
  "Sales",
  "Finance",
  "Operations",
  "Customer Success",
  "Human Resources",
  "DevOps / SRE",
  "Cybersecurity",
  "Business Analyst",
  "Project Management",
  "Content Writing",
] as const;

export type PopularRole = (typeof POPULAR_ROLES)[number];

export function filterRoles(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...POPULAR_ROLES];
  return POPULAR_ROLES.filter((role) => role.toLowerCase().includes(q));
}
