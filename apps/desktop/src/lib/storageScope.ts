import type { ConnectionMode } from "../App";

function normalizeConvexUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function encodeScopePart(value: string): string {
  return encodeURIComponent(value);
}

export function getStorageScope(args: {
  mode: ConnectionMode | null;
  convexUrl: string;
  userScope: string | null;
}): string | null {
  const normalizedUrl = encodeScopePart(normalizeConvexUrl(args.convexUrl));

  if (args.mode === "self-hosted") {
    return `self-hosted:${normalizedUrl}`;
  }

  if (args.mode === "hosted") {
    if (!args.userScope) return null;
    return `hosted:${normalizedUrl}:${encodeScopePart(args.userScope)}`;
  }

  return null;
}

export function getScopedStorageKey(baseKey: string, scope: string): string {
  return `${baseKey}:${scope}`;
}
