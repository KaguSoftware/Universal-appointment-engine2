/**
 * Resolves the app's public base URL for building absolute links and OAuth /
 * payment redirect targets.
 *
 * Precedence:
 *   1. NEXT_PUBLIC_APP_URL          — explicit, always wins (set this in prod).
 *   2. VERCEL_PROJECT_PRODUCTION_URL — stable production domain on Vercel.
 *   3. VERCEL_URL                    — per-deployment URL (preview builds).
 *   4. http://localhost:3000         — local dev fallback.
 *
 * The Vercel-provided values are bare hostnames (no scheme), so https:// is
 * prepended. The returned URL never has a trailing slash.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return stripSlash(explicit);

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${stripSlash(vercel)}`;

  return "http://localhost:3000";
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
