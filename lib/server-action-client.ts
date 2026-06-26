export function serverActionClientErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Connection lost. Refresh the page and try again.";
  }
  return fallback;
}
