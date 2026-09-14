export function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/**
 * Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
 * every publish; the sandbox preview never has it. Single source of truth for
 * the split — gate audience, gate endpoints and connector-token semantics all
 * key off this predicate.
 *
 * Production env (server only — never VITE_):
 *   DATABASE_URL           Neon Postgres (platform injects when deploy.database)
 *   BLOB_READ_WRITE_TOKEN  Vercel Blob store token (photos as public URLs)
 *   GOOGLE_CLIENT_ID       Google OAuth client for Photos Picker
 *   GOOGLE_CLIENT_SECRET   Google OAuth secret
 *   GOOGLE_REDIRECT_URI    optional; default {origin}/api/google/callback
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}
