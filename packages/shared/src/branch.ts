/**
 * Sanitize branch name to be subdomain-safe (RFC 1123)
 * - Lowercase only
 * - / replaced with --
 * - Non-alphanumeric replaced with -
 * - Max 63 characters
 * - No leading/trailing hyphens
 */
export function sanitizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\//g, "--")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{3,}/g, "--")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/, "");
}
