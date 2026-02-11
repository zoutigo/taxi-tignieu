const blockedExactPaths = new Set(["/.env", "/.env.local", "/api/live/ws"]);
const blockedPrefixes = ["/bin/", "/.git/", "/wp-admin", "/wp-login.php", "/xmlrpc.php"];

export function isBlockedPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();

  if (blockedExactPaths.has(normalized)) return true;
  if (normalized.startsWith("/.env.")) return true;
  if (normalized === "/bin" || normalized === "/.git") return true;

  return blockedPrefixes.some((prefix) => normalized.startsWith(prefix));
}
