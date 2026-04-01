import type { QueryCtx } from "../_generated/server";

const SELF_HOSTED_USER = "self-hosted";

export type ResolvedAuthIdentity = {
  userId: string;
  exactUserIds: string[];
  legacyUserPrefixes: string[];
};

function getStableHostedUserId(subject: string): string {
  const [userId] = subject.split("|");
  if (!userId) {
    throw new Error("Unable to determine authenticated user");
  }
  return userId;
}

export async function resolveAuthIdentity(
  ctx: { auth: QueryCtx["auth"] },
): Promise<ResolvedAuthIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    if (process.env.REQUIRE_AUTH === "true") {
      throw new Error("Not authenticated");
    }

    return {
      userId: SELF_HOSTED_USER,
      exactUserIds: [SELF_HOSTED_USER],
      legacyUserPrefixes: [],
    };
  }

  const userId = getStableHostedUserId(identity.subject);
  const exactUserIds = new Set<string>([userId, identity.subject, identity.tokenIdentifier]);
  const legacyUserPrefixes = new Set<string>([`${userId}|`]);

  if (identity.issuer) {
    legacyUserPrefixes.add(`${identity.issuer}|${userId}|`);
  }

  return {
    userId,
    exactUserIds: [...exactUserIds],
    legacyUserPrefixes: [...legacyUserPrefixes],
  };
}

export async function requireAuth(
  ctx: { auth: QueryCtx["auth"] },
): Promise<string> {
  return (await resolveAuthIdentity(ctx)).userId;
}

export function matchesUserId(
  docUserId: string | undefined,
  identity: ResolvedAuthIdentity,
): boolean {
  if (!docUserId) {
    return identity.userId === SELF_HOSTED_USER;
  }

  if (identity.exactUserIds.includes(docUserId)) {
    return true;
  }

  return identity.legacyUserPrefixes.some((prefix) => docUserId.startsWith(prefix));
}

export async function assertOwnership(
  ctx: { auth: QueryCtx["auth"] },
  doc: { userId?: string } | null,
): Promise<void> {
  if (!doc) return;
  const identity = await resolveAuthIdentity(ctx);
  if (!matchesUserId(doc.userId, identity)) {
    throw new Error("Unauthorized");
  }
}

export function isHosted(): boolean {
  return process.env.REQUIRE_AUTH === "true";
}
