export const ACTIVE_STORAGE_SCOPE_KEY = "audiobook_active_storage_scope";

function normalizeConvexUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function encodeScopePart(value: string): string {
  return encodeURIComponent(value);
}

export function getSelfHostedStorageScope(convexUrl: string): string {
  return `self-hosted:${encodeScopePart(normalizeConvexUrl(convexUrl))}`;
}

export function getHostedStorageScope(
  convexUrl: string,
  userScope: string,
): string {
  return `hosted:${encodeScopePart(normalizeConvexUrl(convexUrl))}:${encodeScopePart(
    userScope,
  )}`;
}

export function getScopedStorageKey(baseKey: string, scope: string): string {
  return `${baseKey}:${scope}`;
}
